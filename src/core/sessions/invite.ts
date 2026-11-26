import { EVENT_KINDS, MAX_FRIENDS, ME_KEY, type Invite, type SessionRecord } from '../models';
import type { Rng } from '../utils';

/** Letters and digits that can't be misread (no I, O, 0, 1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const MAX_NAME = 40;
const MAX_TITLE = 60;

export function newCode(rng: Rng, length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[Math.floor(rng.next() * ALPHABET.length)];
  return code;
}

/** Names travel in links as a comma-separated list: no commas, no control characters, one line. */
export function cleanName(name: string): string {
  return name
    .replace(/[,\p{Cc}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
}

export function cleanTitle(title: string): string {
  return title
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE);
}

/**
 * `rtls://join/K7Q2XP?e=marathon&t=City%20Marathon&p=Asha,Riya,Arjun&f=0` — the code, event,
 * title, everyone in order, and who sent it. Without a server the link carries the whole session.
 */
export function inviteUrl(record: SessionRecord, myName: string): string {
  const names = record.people.map((p) =>
    p.key === ME_KEY ? cleanName(myName) || p.name || 'A friend' : p.name,
  );
  const from = Math.max(
    0,
    record.people.findIndex((p) => p.key === ME_KEY),
  );
  return (
    `rtls://join/${record.id}?e=${record.event}&t=${encodeURIComponent(record.title)}` +
    `&p=${names.map(encodeURIComponent).join(',')}&f=${from}`
  );
}

/** An invite from a link's parts (already URL-decoded, as React Navigation hands them over); null if broken. */
export function parseInvite(
  parts: Partial<Record<'code' | 'e' | 't' | 'p' | 'f', string>>,
): Invite | null {
  const code = (parts.code ?? '').toUpperCase();
  if (!CODE.test(code)) return null;
  const event = EVENT_KINDS.find((e) => e === parts.e);
  if (!event) return null;
  const names = (parts.p ?? '').split(',').map(cleanName);
  if (names.length < 2 || names.length > MAX_FRIENDS + 1 || names.some((n) => n === ''))
    return null;
  const from = Number(parts.f ?? '0');
  if (!Number.isInteger(from) || from < 0 || from >= names.length) return null;
  return { code, event, title: cleanTitle(parts.t ?? '') || 'Shared session', names, from };
}

/** The parts of a whole `rtls://join/…` link (for tests and anything outside navigation). */
export function invitePartsOf(
  url: string,
): Partial<Record<'code' | 'e' | 't' | 'p' | 'f', string>> | null {
  const match = url.match(/^rtls:\/\/join\/([^?/]*)\/?(?:\?(.*))?$/);
  if (!match) return null;
  const parts: Record<string, string> = { code: decodeURIComponent(match[1] ?? '') };
  for (const pair of (match[2] ?? '').split('&')) {
    const [key, value] = pair.split('=');
    if (key) parts[key] = decodeURIComponent(value ?? '');
  }
  return parts;
}
