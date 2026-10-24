// SuperMemo SM-2: https://www.super-memory.com/english/ol/sm2.htm
// Quality 0..5; 0..2 reset repetitions, 3..5 pass. Ease floor: 1.3.
import type { Card } from './types';
export function schedule(card: Card, quality: number, now = new Date()): Card {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5)
    throw new Error('Quality must be an integer between 0 and 5');
  const passed = quality >= 3;
  const interval = passed
    ? card.repetitions === 0
      ? 1
      : card.repetitions === 1
        ? 6
        : Math.ceil(card.interval * card.ease)
    : 1;
  const ease = Math.max(1.3, card.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return {
    ...card,
    interval,
    ease,
    repetitions: passed ? card.repetitions + 1 : 0,
    lapses: card.lapses + (passed ? 0 : 1),
    version: card.version + 1,
    due_at: new Date(now.getTime() + interval * 86400000).toISOString(),
  };
}
export function recallPrompt(
  entry: { term: string; meaning: string; sentence: string; kind: string },
  format: string,
) {
  switch (format) {
    case 'meaning-word':
      return { label: 'Find the expression', prompt: entry.meaning, answer: entry.term };
    case 'cloze':
      return {
        label: 'Complete the passage',
        prompt: entry.sentence.replace(
          new RegExp(entry.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          '________',
        ),
        answer: entry.term,
      };
    case 'original':
      return {
        label: 'Make it your own',
        prompt: `Write an original sentence using “${entry.term}”.`,
        answer: entry.meaning,
      };
    case 'identify':
      return {
        label: 'Name the construction',
        prompt: entry.sentence || entry.meaning,
        answer: entry.term,
      };
    case 'rewrite':
      return {
        label: 'Change the structure',
        prompt: `Rewrite this using ${entry.term}: ${entry.sentence || 'Write your own base sentence first.'}`,
        answer: entry.meaning,
      };
    default:
      return { label: 'Recall the meaning', prompt: entry.term, answer: entry.meaning };
  }
}
