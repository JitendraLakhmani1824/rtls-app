import {
  Presence,
  type Budget,
  type ConnState,
  type FriendRow,
  type Cursor,
  type FixBatch,
  type Member,
  type PresenceBatch,
  type SessionProfile,
} from '../models';
import type {
  DeviceManager,
  FeedHandle,
  FeedManager,
  FeedSink,
  MapManager,
  Perf,
  Readable,
  Session,
  Stop,
} from '../protocols';
import { bearingDeg, createStore, distanceMeters } from '../utils';
import { budgetFor } from './budget';
import { Presenter } from './presenter';
import { LocationStore } from './store';
import { throttle } from './throttle';
import { TrailStore } from './trails';

export type LiveSessionDeps = {
  feed: FeedManager;
  map: MapManager;
  device: DeviceManager;
  perf: Perf;
  profile: SessionProfile;
};

const TICK_MS = 1000;
const VIEWPORT_THROTTLE_MS = 150;
/** Trails are re-sent at least this often so their fading keeps up with time. */
const TRAIL_AGE_REFRESH_MS = 30_000;
/** Fitting one friend (or friends in one spot) still shows this much around them, degrees (~200 m). */
const MIN_FIT_SPAN_DEG = 0.002;

/**
 * The controller. The only code that starts or stops anything.
 * Running = app in the foreground AND map ready. Otherwise paused: no feed, no ticks, nothing drawn.
 * Navigation focus is deliberately ignored (a sheet over the map must not pause it).
 */
export class LiveSession implements Session {
  readonly selected = createStore<number | null>(null);
  readonly connection = createStore<ConnState>({ kind: 'reconnecting', sinceMs: 0 });
  /** Computed when read, at most once per tick; subscribers are told once per tick. */
  readonly rows: Readable<FriendRow[]> = {
    get: () => {
      if (this.rowsTick !== this.tickNo) {
        this.rowsCache = this.computeRows(this.deps.device.clock.now());
        this.rowsTick = this.tickNo;
      }
      return this.rowsCache;
    },
    subscribe: (listener) => this.rowsVersion.subscribe(listener),
  };

  private readonly store = new LocationStore();
  private readonly trails = new TrailStore();
  private readonly presenter = new Presenter();
  private readonly changed: number[] = [];
  private members: Member[] = [];
  private handle: FeedHandle | null = null;
  private cursor: Cursor | undefined;
  private stopTick: Stop | null = null;
  private budget: Budget;
  private stillDirty = false;
  private trailsDirty = false;
  private lastTrailsAt = 0;
  private tickNo = 0;
  private rowsTick = -1;
  private rowsCache: FriendRow[] = [];
  private readonly rowsVersion = createStore(0);
  private fitted = false;
  /** The user moved the map: the app stops moving the camera. */
  private cameraFree = false;

  /** While the user pans or zooms, motion updates slow to the budget's gesture rate. */
  private readonly gestureMoving: ReturnType<typeof throttle>;
  private readonly viewportChange: ReturnType<typeof throttle>;
  private readonly stillSoon: ReturnType<typeof throttle>;
  private readonly deps: LiveSessionDeps;

  constructor(deps: LiveSessionDeps) {
    this.deps = deps;
    const clock = deps.device.clock;
    this.budget = budgetFor(deps.device.power.get());
    this.gestureMoving = throttle(
      clock,
      () => 1000 / this.budget.gestureUpdatesPerSec,
      () => this.sendMoving(),
    );
    this.viewportChange = throttle(
      clock,
      () => VIEWPORT_THROTTLE_MS,
      () => this.applyViewport(),
    );
    this.stillSoon = throttle(
      clock,
      () => (this.gesturing ? 1000 / this.budget.gestureUpdatesPerSec : VIEWPORT_THROTTLE_MS),
      () => this.flushStill(),
    );
  }

  /** Starts following foreground/map/power state. Returns stop(); start() may be called again afterwards. */
  start(): Stop {
    const { device, map } = this.deps;
    const update = () => (device.foreground.get() && map.ready.get() ? this.run() : this.pause());
    const subscriptions = [
      device.foreground.subscribe(update),
      map.ready.subscribe(update),
      map.onPinPress((member) => this.select(member)),
      device.power.subscribe(() => this.applyBudget()),
      map.viewport.subscribe(() => {
        if (map.viewport.get()?.gesturing) this.cameraFree = true; // the user took the camera
        if (this.running) this.viewportChange.call();
      }),
    ];
    this.applyBudget();
    update();
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      this.pause();
    };
  }

  get running() {
    return this.handle !== null;
  }

  select(member: number | null) {
    this.selected.set(member);
    this.deps.map.setSelected(member);
    if (this.presenter.updateGliding(this.store, member)) this.sendMoving();
    this.stillDirty = true;
    this.trailsDirty = true;
    if (this.running) {
      this.flushTrails();
      this.stillSoon.call();
    }
  }

  private get gesturing() {
    return this.deps.map.viewport.get()?.gesturing ?? false;
  }

  private run() {
    if (this.handle) return;
    this.presenter.setViewport(this.deps.map.viewport.get());
    this.handle = this.deps.feed.start(this.sink, this.cursor);
    this.stopTick = this.deps.device.clock.every(TICK_MS, this.tick);
    this.resendAll(); // the map may have been recreated while paused
  }

  private pause() {
    if (!this.handle) return;
    this.cursor = this.handle.cursor();
    this.handle.stop();
    this.handle = null;
    this.stopTick?.();
    this.stopTick = null;
    this.gestureMoving.cancel();
    this.viewportChange.cancel();
    this.stillSoon.cancel();
  }

  private readonly sink: FeedSink = {
    onMembers: (members) => {
      const { profile, map } = this.deps;
      this.members = members;
      this.store.reset(members.length, profile.maxSpeedMs);
      this.trails.reset(members.length, profile);
      this.presenter.reset(members.length);
      this.fitted = false;
      this.cameraFree = false;
      this.tickNo++;
      map.setMembers(members);
    },
    onFixes: (batch) => this.ingest(batch),
    onPresence: (batch) => this.heartbeat(batch),
    onState: (state) => this.connection.set(state),
    onSessionEnded: () => this.pause(),
  };

  private ingest(batch: FixBatch) {
    const { perf } = this.deps;
    perf.count('fixes', batch.n);
    const changed = perf.measure('ingest', () => this.store.ingest(batch, this.changed));
    if (changed === 0) return;

    const selected = this.selected.get();
    for (const m of this.changed) {
      const s = this.store;
      const added = this.trails.append(
        m,
        s.lng(m),
        s.lat(m),
        s.time(m),
        s.accuracy(m),
        s.snapped(m),
      );
      if (added && this.presenter.drawsTrail(m, s, selected)) this.trailsDirty = true;
    }
    if (
      perf.measure('visibility', () => this.presenter.updateVisibility(this.store, this.changed))
    ) {
      this.stillDirty = true;
      this.trailsDirty = true;
    }
    // Who glides is re-decided on the tick, not here (see tick()).
    let glidingMoved = false;
    for (const m of this.changed) {
      if (this.presenter.isGliding(m)) glidingMoved = true;
      else if (this.presenter.isVisible(m)) this.stillDirty = true;
    }
    if (glidingMoved) this.requestMoving();
  }

  private heartbeat(batch: PresenceBatch) {
    if (this.store.heartbeat(batch)) {
      // Someone paused or resumed: they appear or disappear now, not at the next tick.
      if (this.presenter.updateGliding(this.store, this.selected.get())) this.requestMoving();
      this.stillDirty = true;
      this.trailsDirty = true;
      this.stillSoon.call();
    }
  }

  private applyViewport() {
    const viewport = this.deps.map.viewport.get();
    this.presenter.setViewport(viewport);
    if (viewport) this.handle?.setViewport(viewport);
    if (this.presenter.updateVisibility(this.store)) {
      this.stillDirty = true;
      this.trailsDirty = true;
      this.stillSoon.call();
    }
    if (this.presenter.updateGliding(this.store, this.selected.get())) {
      this.stillDirty = true;
      this.requestMoving();
      this.stillSoon.call();
    }
  }

  private applyBudget() {
    this.budget = budgetFor(this.deps.device.power.get());
    this.presenter.setBudget(this.budget);
    this.deps.map.setFrameRateCap(this.budget.glideFps);
    if (this.running && this.presenter.updateGliding(this.store, this.selected.get())) {
      this.sendMoving();
      this.stillDirty = true;
      this.stillSoon.call();
    }
  }

  private readonly tick = () => {
    const now = this.deps.device.clock.now();
    if (this.presenter.presenceChanged(this.store, now)) this.stillDirty = true;
    // Pins move between the gliding and still sources here, both in the same tick: a pin is never
    // drawn twice or missing, and the still source stays at ≤ 1 update a second.
    const glideChanged = this.deps.perf.measure('glide', () =>
      this.presenter.updateGliding(this.store, this.selected.get()),
    );
    if (glideChanged) {
      this.sendMoving();
      this.stillDirty = true;
    }
    if (now - this.lastTrailsAt >= TRAIL_AGE_REFRESH_MS) this.trailsDirty = true;
    this.flushTrails();
    this.flushStill();
    this.applyCamera();
    this.tickNo++;
    if (this.rowsVersion.observed()) this.rowsVersion.set(this.tickNo);
  };

  /**
   * Keeps every friend in view: frames them all at start, and again only when someone leaves the
   * view — until the user moves the map, after which the camera is theirs.
   */
  private applyCamera() {
    if (this.cameraFree) return;
    const { map } = this.deps;
    const view = map.viewport.get();
    const s = this.store;
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    let outside = false;
    for (let m = 0; m < s.size; m++) {
      if (!s.has(m) || s.paused(m)) continue;
      const lng = s.lng(m);
      const lat = s.lat(m);
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      if (view && (lng < view.west || lng > view.east || lat < view.south || lat > view.north))
        outside = true;
    }
    if (!Number.isFinite(west) || (this.fitted && !outside)) return;
    const padLng = Math.max(0, MIN_FIT_SPAN_DEG - (east - west)) / 2;
    const padLat = Math.max(0, MIN_FIT_SPAN_DEG - (north - south)) / 2;
    map.fitTo(west - padLng, south - padLat, east + padLng, north + padLat);
    this.fitted = true;
  }

  /** Every friend but me, nearest first; paused friends last. */
  private computeRows(now: number): FriendRow[] {
    const s = this.store;
    const me = this.members.find((m) => m.isMe);
    const meAt = me && s.has(me.id) ? [s.lng(me.id), s.lat(me.id)] : null;
    const rows: FriendRow[] = [];
    for (const member of this.members) {
      if (member.isMe) continue;
      const m = member.id;
      const known = meAt !== null && s.has(m);
      rows.push({
        id: m,
        name: member.name,
        initials: member.initials,
        colour: member.colour,
        presence: s.presence(m, now),
        distanceM: known ? distanceMeters(meAt[0] ?? 0, meAt[1] ?? 0, s.lng(m), s.lat(m)) : NaN,
        bearingDeg: known ? bearingDeg(meAt[0] ?? 0, meAt[1] ?? 0, s.lng(m), s.lat(m)) : NaN,
        silentMs: now - s.heardAt(m),
        speedMs: s.speed(m),
      });
    }
    const key = (r: FriendRow) =>
      (r.presence === Presence.Paused ? 1e12 : 0) +
      (Number.isNaN(r.distanceM) ? 1e11 : r.distanceM);
    return rows.sort((a, b) => key(a) - key(b));
  }

  private requestMoving() {
    if (this.gesturing) this.gestureMoving.call();
    else this.sendMoving();
  }

  private sendMoving() {
    const frame = this.deps.perf.measure('motionFrame', () =>
      this.presenter.motionFrame(this.store),
    );
    this.deps.map.setMoving(frame);
    this.deps.perf.count('movingFrames');
  }

  private flushStill() {
    if (!this.stillDirty) return;
    this.stillDirty = false;
    const now = this.deps.device.clock.now();
    const frame = this.deps.perf.measure('stillFrame', () =>
      this.presenter.stillFrame(this.store, now),
    );
    this.deps.map.setStill(frame);
    this.deps.perf.count('stillFrames');
  }

  private flushTrails() {
    if (!this.trailsDirty) return;
    this.trailsDirty = false;
    const now = this.deps.device.clock.now();
    this.lastTrailsAt = now;
    const { profile, perf } = this.deps;
    const frame = perf.measure('trailFrame', () =>
      this.presenter.trailFrame(
        this.trails,
        this.store,
        this.selected.get(),
        now,
        profile.trailWindowMs,
      ),
    );
    this.deps.map.setTrails(frame);
    perf.count('trailFrames');
  }

  private resendAll() {
    if (this.members.length === 0) return;
    const { map } = this.deps;
    map.setMembers(this.members);
    map.setSelected(this.selected.get());
    map.setFrameRateCap(this.budget.glideFps);
    this.presenter.updateVisibility(this.store);
    this.presenter.updateGliding(this.store, this.selected.get());
    this.stillDirty = true;
    this.trailsDirty = true;
    this.flushStill();
    this.flushTrails();
    this.sendMoving();
  }
}
