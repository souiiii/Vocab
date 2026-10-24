import { describe, it, expect } from 'vitest';
import { schedule, recallPrompt } from '../src/lib/srs';
import type { Card } from '../src/lib/types';
const time = new Date('2026-10-24T00:00:00.000Z');
const card: Card = {
  id: 'one',
  entry_id: 'entry',
  format: 'word-meaning',
  due_at: time.toISOString(),
  interval: 0,
  ease: 2.5,
  repetitions: 0,
  lapses: 0,
  version: 0,
};
describe('SM-2 interval scheduling', () => {
  it('follows 1, 6, 15, 38 day intervals for quality 4', () => {
    let c = card;
    const intervals = [];
    for (let n = 0; n < 4; n++) {
      c = schedule(c, 4, time);
      intervals.push(c.interval);
    }
    expect(intervals).toEqual([1, 6, 15, 38]);
    expect(c.ease).toBe(2.5);
  });
  it('increases ease after perfect recall', () => {
    expect(schedule(card, 5, time).ease).toBeCloseTo(2.6);
  });
  it('resets repetitions and counts lapses after failure', () => {
    const c = schedule({ ...card, repetitions: 4, interval: 45 }, 1, time);
    expect(c.repetitions).toBe(0);
    expect(c.interval).toBe(1);
    expect(c.lapses).toBe(1);
    expect(c.due_at).toBe('2026-10-25T00:00:00.000Z');
  });
  it('never lets ease fall below 1.3', () => {
    let c = card;
    for (let i = 0; i < 100; i++) c = schedule(c, 0, time);
    expect(c.ease).toBe(1.3);
    expect(c.lapses).toBe(100);
  });
  it.each([-1, 6, 1.2, NaN])('rejects invalid quality %s', (q) => {
    expect(() => schedule(card, q, time)).toThrow();
  });
  it('does not mutate the source card', () => {
    schedule(card, 4, time);
    expect(card.version).toBe(0);
    expect(card.interval).toBe(0);
  });
  it('uses elapsed UTC days over a daylight saving change', () => {
    const c = schedule(card, 4, new Date('2026-11-01T05:30:00Z'));
    expect(c.due_at).toBe('2026-11-02T05:30:00.000Z');
  });
  it('escapes regex characters in cloze expressions', () => {
    expect(
      recallPrompt(
        { term: 'a+b', meaning: 'sum', sentence: 'Use a+b here.', kind: 'word' },
        'cloze',
      ).prompt,
    ).toBe('Use ________ here.');
  });
});
