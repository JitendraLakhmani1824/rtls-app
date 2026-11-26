import type { Viewport } from '../models';
import type { MapManager } from '../protocols';
import { bearingDeg, distanceMeters } from '../utils';
import { glideMs } from './presenter';
import type { LocationStore } from './store';

/** Selecting a friend zooms in at least this far, so you can see them move. */
export const TRACK_ZOOM = 16;
/** Fitting one friend (or friends in one spot) still shows this much around them, degrees (~200 m). */
const MIN_FIT_SPAN_DEG = 0.002;
/** Calm follow: re-centre once the friend has moved this share of the view. */
const FOLLOW_SLACK = 0.15;
const INTRO_MS = 1800;
const FLY_MS = 1200;
const EASE_MS = 600;
const CALM_MS = 400;
/** Tilt and turn with a friend moving faster than this (running, cycling, driving), m/s. */
const TILT_FROM_MS = 2;
/** Back to flat and north up once they're slower than this. */
const FLAT_BELOW_MS = 0.5;
const TILT_DEG = 45;
/** Turn the map only when their direction changes by more than this: no wobble from GPS noise. */
const TURN_MIN_DEG = 15;
/** Shorter moves than this give no direction. */
const HEADING_MIN_M = 3;

/**
 * Where the camera looks (design §2.4, Camera). The map animates every move itself: no JavaScript per frame.
 * - fit: frames everyone when the session starts (flying in from the city on the first open),
 *   and again only when someone leaves the view.
 * - follow: flies to the selected friend, then moves with them: each new fix sends a linear move
 *   with the same target and duration as their gliding pin, so pin and camera travel together.
 *   Moving fast, the map tilts and turns to their direction of travel; when they stop, it levels.
 * - free: after any gesture the camera is the user's.
 * Calm (Low Power Mode or Reduce Motion): short eases, no tilt or turn, re-centring only when the
 * friend nears the edge.
 */
export class CameraDirector {
  private mode: 'fit' | 'follow' | 'free' = 'fit';
  private fitted = false;
  private followed = -1;
  /** Where the camera was last sent while following. */
  private at: [number, number] = [NaN, NaN];
  /** The followed friend's fix time the camera last moved to. */
  private fixAt = NaN;
  private tilted = false;
  private bearing = 0;
  private busyUntil = -Infinity;
  private calm = false;
  private intro = false;

  constructor(
    private readonly map: MapManager,
    /** Each new map opens over the city and flies in to frame everyone. */
    private readonly introOnOpen = false,
  ) {}

  get following() {
    return this.mode === 'follow' ? this.followed : null;
  }

  /** A map was just mounted (at its opening view). */
  newMap() {
    this.intro = this.introOnOpen;
  }

  /** A fresh member list: frame everyone again. */
  reset() {
    this.mode = 'fit';
    this.fitted = false;
    this.followed = -1;
    this.tilted = false;
    this.bearing = 0;
  }

  /** The user moved the map: the camera is theirs until they select someone. */
  release() {
    this.mode = 'free';
  }

  setCalm(calm: boolean) {
    this.calm = calm;
  }

  select(m: number | null, store: LocationStore, now: number) {
    if (m !== null && store.has(m)) {
      this.mode = 'follow';
      this.followed = m;
      this.at = [store.lng(m), store.lat(m)];
      this.fixAt = store.time(m);
      this.tilted = !this.calm && store.speed(m) >= TILT_FROM_MS;
      if (!this.tilted) this.bearing = 0;
      const ms = this.calm ? CALM_MS : FLY_MS;
      this.map.moveCamera({
        lng: this.at[0],
        lat: this.at[1],
        zoom: Math.max(this.map.viewport.get()?.zoom ?? 0, TRACK_ZOOM),
        pitch: this.tilted ? TILT_DEG : 0,
        bearing: this.bearing,
        ms,
        path: this.calm ? 'ease' : 'fly',
      });
      this.busyUntil = now + ms; // let the flight land before following
    } else if (m === null && this.mode === 'follow') {
      // The sheet closed: stay where we are, levelled.
      this.mode = 'free';
      this.followed = -1;
      if (this.tilted || this.bearing !== 0) this.level();
    }
  }

  /** Called on every batch that moved the followed friend, and on the tick. */
  follow(store: LocationStore, now: number) {
    if (this.mode !== 'follow' || now < this.busyUntil) return;
    const m = this.followed;
    if (!store.has(m)) return;
    const fresh = store.time(m) !== this.fixAt;
    if (!fresh) {
      // Heartbeats only: they've stopped. Level the map.
      if (this.tilted && store.speed(m) < FLAT_BELOW_MS) this.level();
      return;
    }
    const lng = store.lng(m);
    const lat = store.lat(m);
    if (this.calm) {
      const view = this.map.viewport.get();
      const drifted =
        !view ||
        Math.abs(lng - this.at[0]) > (view.east - view.west) * FOLLOW_SLACK ||
        Math.abs(lat - this.at[1]) > (view.north - view.south) * FOLLOW_SLACK;
      this.fixAt = store.time(m);
      if (!drifted) return;
      this.at = [lng, lat];
      this.map.moveCamera({ lng, lat, pitch: 0, bearing: 0, ms: CALM_MS, path: 'ease' });
      return;
    }
    const speed = store.speed(m);
    if (!this.tilted && speed >= TILT_FROM_MS) this.tilted = true;
    else if (this.tilted && speed < FLAT_BELOW_MS) this.tilted = false;
    if (!this.tilted) this.bearing = 0;
    else if (distanceMeters(this.at[0], this.at[1], lng, lat) >= HEADING_MIN_M) {
      const heading = bearingDeg(this.at[0], this.at[1], lng, lat);
      if (angleBetween(heading, this.bearing) > TURN_MIN_DEG) this.bearing = Math.round(heading);
    }
    const ms = glideMs(store, m);
    this.at = [lng, lat];
    this.fixAt = store.time(m);
    this.map.moveCamera({
      lng,
      lat,
      pitch: this.tilted ? TILT_DEG : 0,
      bearing: this.bearing,
      ms: ms > 0 ? ms : EASE_MS,
      path: ms > 0 ? 'linear' : 'ease', // a confirmed GPS jump: the pin snaps, the camera eases
    });
  }

  /** Frames everyone at start, and again only when someone leaves the view. */
  fit(store: LocationStore, view: Viewport | null) {
    if (this.mode !== 'fit') return;
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    let outside = false;
    for (let m = 0; m < store.size; m++) {
      if (!store.has(m) || store.paused(m)) continue;
      const lng = store.lng(m);
      const lat = store.lat(m);
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
    const flyIn = this.intro && !this.calm;
    this.intro = false; // once per map
    this.map.fitTo(
      west - padLng,
      south - padLat,
      east + padLng,
      north + padLat,
      flyIn ? { ms: INTRO_MS, path: 'fly' } : { ms: this.calm ? CALM_MS : EASE_MS, path: 'ease' },
    );
    this.fitted = true;
  }

  private level() {
    this.tilted = false;
    this.bearing = 0;
    this.map.moveCamera({
      lng: this.at[0],
      lat: this.at[1],
      pitch: 0,
      bearing: 0,
      ms: EASE_MS,
      path: 'ease',
    });
  }
}

/** Smallest angle between two bearings, 0–180°. */
function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
