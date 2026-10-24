import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, databaseMode, insert, type Query } from './db';
import {
  starterArticles,
  starterEntries,
  starterLessons,
  starterQuestions,
  defaultSettings,
} from './seed';
import {
  articleInput,
  annotationInput,
  entryInput,
  questionInput,
  settingsInput,
  reviewInput,
  attemptInput,
  normalize,
  AppError,
} from './validation';
import { schedule } from './srs';
import type { Snapshot, Article, Card, Question, Entry, Settings } from './types';
const now = () => new Date().toISOString();
export const learningTables = [
  'articles',
  'annotations',
  'entries',
  'cards',
  'reviews',
  'lessons',
  'lesson_progress',
  'questions',
  'attempts',
  'mistakes',
  'settings',
] as const;
export async function initialise() {
  const connection = await db();
  await connection.transaction(async (q) => {
    if (databaseMode() === 'neon') await q('SELECT pg_advisory_xact_lock($1)', [7361051]);
    if ((await q('SELECT id FROM settings WHERE id=$1', ['profile'])).length) return;
    for (const a of starterArticles) await insert(q, 'articles', a);
    for (const l of starterLessons) await insert(q, 'lessons', l);
    for (const question of starterQuestions) await insert(q, 'questions', question);
    for (const entry of starterEntries) {
      await insert(q, 'entries', entry);
      await makeCards(q, entry.id, entry.kind, entry.sentence, entry.term);
    }
    await insert(q, 'settings', { id: 'profile', value: defaultSettings });
  });
}
export async function snapshot(): Promise<Snapshot> {
  await initialise();
  const connection = await db();
  return connection.transaction(async (q) => {
    const result: Record<string, unknown> = {};
    for (const t of learningTables) result[t] = await q('SELECT * FROM "' + t + '"');
    result.settings =
      (result.settings as { value: Settings }[]).find(Boolean)?.value || defaultSettings;
    result.database = databaseMode();
    return result as Snapshot;
  });
}
async function makeCards(q: Query, id: string, kind: string, sentence: string, term: string) {
  const formats =
    kind === 'grammar' || kind === 'construction'
      ? ['identify', 'rewrite']
      : [
          'word-meaning',
          'meaning-word',
          ...(sentence.toLowerCase().includes(term.toLowerCase()) ? ['cloze'] : []),
          'original',
        ];
  for (const format of formats)
    await insert(
      q,
      'cards',
      {
        id: randomUUID(),
        entry_id: id,
        format,
        due_at: now(),
        interval: 0,
        ease: 2.5,
        repetitions: 0,
        lapses: 0,
        version: 0,
      },
      true,
    );
}
export async function command(action: string, input: unknown) {
  await initialise();
  const connection = await db();
  return connection.transaction(async (q) => {
    const data = z.record(z.string(), z.unknown()).parse(input);
    switch (action) {
      case 'article.create': {
        const a = articleInput.parse(data);
        if (a.url && (await q('SELECT id FROM articles WHERE url=$1', [a.url])).length)
          throw new AppError(409, 'This article URL is already in your library.');
        const row = { ...a, id: randomUUID(), status: 'unread', progress: 0, created_at: now() };
        await insert(q, 'articles', row);
        return row;
      }
      case 'article.progress': {
        const a = z
          .object({
            id: z.string(),
            progress: z.number().min(0).max(100),
            status: z.enum(['unread', 'reading', 'finished']),
          })
          .parse(data);
        await q('UPDATE articles SET progress=$1,status=$2 WHERE id=$3', [
          a.progress,
          a.status,
          a.id,
        ]);
        return a;
      }
      case 'article.delete': {
        await q('DELETE FROM articles WHERE id=$1', [z.string().parse(data.id)]);
        return {};
      }
      case 'annotation.create': {
        const a = annotationInput.parse(data);
        const [article] = await q<Article>('SELECT * FROM articles WHERE id=$1', [a.article_id]);
        if (!article || article.content.slice(a.start, a.end) !== a.quote)
          throw new AppError(400, 'The passage anchor does not match the saved article.');
        const row = { ...a, id: randomUUID(), created_at: now() };
        await insert(q, 'annotations', row);
        return row;
      }
      case 'annotation.update': {
        await q('UPDATE annotations SET note=$1 WHERE id=$2', [
          z.string().max(10000).parse(data.note),
          z.string().parse(data.id),
        ]);
        return {};
      }
      case 'annotation.delete': {
        await q('DELETE FROM annotations WHERE id=$1', [z.string().parse(data.id)]);
        return {};
      }
      case 'entry.save': {
        const e = entryInput.parse(data),
          id = z.string().optional().parse(data.id) || randomUUID();
        const normalized = normalize(e.term);
        const duplicate = await q<Entry>(
          'SELECT * FROM entries WHERE normalized=$1 AND kind=$2 AND id<>$3',
          [normalized, e.kind, id],
        );
        if (duplicate.length)
          throw new AppError(
            409,
            'This entry already exists. Open it to edit, or merge your entries.',
          );
        const existing = await q('SELECT id FROM entries WHERE id=$1', [id]);
        const row = { ...e, id, normalized, created_at: now() };
        if (existing.length) {
          const keys = Object.keys(e);
          await q(
            'UPDATE entries SET ' +
              keys.map((k, i) => '"' + k + '"=$' + (i + 1)).join(',') +
              ',normalized=$' +
              (keys.length + 1) +
              ' WHERE id=$' +
              (keys.length + 2),
            [...keys.map((k) => e[k as keyof typeof e]), normalized, id],
          );
        } else await insert(q, 'entries', row);
        await makeCards(q, id, e.kind, e.sentence, e.term);
        return row;
      }
      case 'entry.delete': {
        await q('DELETE FROM entries WHERE id=$1', [z.string().parse(data.id)]);
        return {};
      }
      case 'entry.merge': {
        const a = z
          .object({ source: z.string(), target: z.string() })
          .refine((a) => a.source !== a.target)
          .parse(data);
        const rows = await q<Entry>('SELECT * FROM entries WHERE id=$1 OR id=$2', [
          a.source,
          a.target,
        ]);
        if (rows.length !== 2) throw new AppError(404, 'Both entries must exist.');
        const source = rows.find((e) => e.id === a.source)!,
          target = rows.find((e) => e.id === a.target)!;
        await q('UPDATE entries SET examples=$1,tags=$2,sentence=$3,meaning=$4 WHERE id=$5', [
          [target.examples, source.examples].filter(Boolean).join('\n'),
          [target.tags, source.tags].filter(Boolean).join(', '),
          target.sentence || source.sentence,
          [target.meaning, source.meaning].filter(Boolean).join('\n'),
          target.id,
        ]);
        for (const card of await q<Card>('SELECT * FROM cards WHERE entry_id=$1', [source.id])) {
          const [match] = await q<Card>('SELECT * FROM cards WHERE entry_id=$1 AND format=$2', [
            target.id,
            card.format,
          ]);
          if (match) {
            await q('UPDATE reviews SET card_id=$1 WHERE card_id=$2', [match.id, card.id]);
            await q('UPDATE cards SET due_at=$1,lapses=lapses+$2,version=version+1 WHERE id=$3', [
              card.due_at < match.due_at ? card.due_at : match.due_at,
              card.lapses,
              match.id,
            ]);
          } else await q('UPDATE cards SET entry_id=$1 WHERE id=$2', [target.id, card.id]);
        }
        await q('DELETE FROM entries WHERE id=$1', [source.id]);
        return {};
      }
      case 'review.submit': {
        const r = reviewInput.parse(data);
        const [card] = await q<Card>('SELECT * FROM cards WHERE id=$1 FOR UPDATE', [r.card_id]);
        if (!card) throw new AppError(404, 'Review card not found.');
        if (card.version !== r.version)
          throw new AppError(409, 'This card was already reviewed. Refresh the queue.');
        if (card.due_at > now()) throw new AppError(409, 'This review is not due yet.');
        const next = schedule(card, r.quality);
        await q(
          'UPDATE cards SET due_at=$1,interval=$2,ease=$3,repetitions=$4,lapses=$5,version=$6 WHERE id=$7',
          [
            next.due_at,
            next.interval,
            next.ease,
            next.repetitions,
            next.lapses,
            next.version,
            next.id,
          ],
        );
        await insert(q, 'reviews', {
          id: randomUUID(),
          card_id: card.id,
          quality: r.quality,
          response: r.response,
          reviewed_at: now(),
          interval: next.interval,
        });
        await q('UPDATE entries SET status=$1 WHERE id=$2', [
          next.repetitions >= 3 ? 'familiar' : 'learning',
          card.entry_id,
        ]);
        if (r.quality < 3) {
          const [entry] = await q<Entry>('SELECT * FROM entries WHERE id=$1', [card.entry_id]);
          await insert(q, 'mistakes', {
            id: randomUUID(),
            attempt_id: null,
            topic: entry.kind,
            prompt: entry.term + ' · ' + card.format,
            response: r.response,
            feedback: entry.meaning,
            subjective: card.format === 'original' || card.format === 'rewrite',
            resolved: false,
            created_at: now(),
          });
        }
        return next;
      }
      case 'question.create': {
        const question = questionInput.parse(data);
        const [article] = await q<Article>('SELECT * FROM articles WHERE id=$1', [
          question.article_id,
        ]);
        if (!article || !article.content.includes(question.evidence))
          throw new AppError(400, 'Supporting evidence must be an exact passage from the article.');
        const row = {
          ...question,
          id: randomUUID(),
          lesson_id: null,
          ai_generated: question.ai_generated,
        };
        await insert(q, 'questions', row);
        return row;
      }
      case 'attempt.submit': {
        const a = attemptInput.parse(data);
        const [question] = await q<Question>('SELECT * FROM questions WHERE id=$1', [
          a.question_id,
        ]);
        if (!question) throw new AppError(404, 'Question not found.');
        if (question.article_id) {
          const [article] = await q<Article>('SELECT * FROM articles WHERE id=$1', [
            question.article_id,
          ]);
          if (!a.evidence || !article.content.includes(a.evidence))
            throw new AppError(400, 'Quote a supporting passage from the article.');
        }
        if (question.subjective && !a.self_assessment)
          throw new AppError(
            400,
            'Compare your response with the guidance and choose a self-assessment.',
          );
        const correct = question.subjective
          ? null
          : normalize(a.response) === normalize(question.answer);
        const attempt = {
          id: randomUUID(),
          question_id: question.id,
          response: a.response,
          evidence: a.evidence,
          correct,
          created_at: now(),
        };
        await insert(q, 'attempts', attempt);
        if (correct === false || a.self_assessment === 'revisit')
          await insert(q, 'mistakes', {
            id: randomUUID(),
            attempt_id: attempt.id,
            topic: question.type,
            prompt: question.prompt,
            response: a.response,
            feedback: question.answer + '\n' + question.explanation,
            subjective: question.subjective,
            resolved: false,
            created_at: now(),
          });
        return { correct, answer: question.answer, explanation: question.explanation };
      }
      case 'lesson.complete': {
        const id = z.string().parse(data.id);
        const [stats] = await q<{ total: number; done: number }>(
          'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM attempts a WHERE a.question_id=q.id AND a.correct=true))::int AS done FROM questions q WHERE lesson_id=$1',
          [id],
        );
        if (!stats.total || stats.done < stats.total)
          throw new AppError(400, 'Answer each exercise correctly before completing this lesson.');
        await q(
          'INSERT INTO lesson_progress VALUES ($1,true,$2) ON CONFLICT (lesson_id) DO UPDATE SET completed=true,updated_at=EXCLUDED.updated_at',
          [id, now()],
        );
        return {};
      }
      case 'mistake.resolve': {
        await q('UPDATE mistakes SET resolved=$1 WHERE id=$2', [
          z.boolean().parse(data.resolved),
          z.string().parse(data.id),
        ]);
        return {};
      }
      case 'mistake.create': {
        const a = z
          .object({
            topic: z.string().min(1),
            prompt: z.string().min(1),
            response: z.string().min(1),
            feedback: z.string().min(1),
            subjective: z.boolean(),
          })
          .parse(data);
        await insert(q, 'mistakes', {
          ...a,
          id: randomUUID(),
          attempt_id: null,
          resolved: false,
          created_at: now(),
        });
        return {};
      }
      case 'settings.save': {
        const settings = settingsInput.parse(data);
        await q('UPDATE settings SET value=$1 WHERE id=$2', [JSON.stringify(settings), 'profile']);
        return {};
      }
      default:
        throw new AppError(400, 'Unknown operation.');
    }
  });
}
