import { z } from 'zod';
import { db, insert } from './db';
import { learningTables, initialise } from './service';
import { articleInput, entryInput, settingsInput, AppError, normalize } from './validation';
const id = z.string().min(1).max(500),
  text = z.string().max(500000),
  date = z.iso.datetime();
const schemas = {
  articles: articleInput
    .extend({
      id,
      status: z.enum(['unread', 'reading', 'finished']),
      progress: z.number().min(0).max(100),
      created_at: date,
    })
    .strict(),
  annotations: z
    .object({
      id,
      article_id: id,
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
      quote: text.min(1),
      note: text,
      kind: z.enum(['highlight', 'grammar']),
      created_at: date,
    })
    .strict(),
  entries: entryInput.extend({ id, normalized: z.string(), created_at: date }).strict(),
  cards: z
    .object({
      id,
      entry_id: id,
      format: z.enum(['word-meaning', 'meaning-word', 'cloze', 'original', 'identify', 'rewrite']),
      due_at: date,
      interval: z.number().nonnegative(),
      ease: z.number().min(1.3),
      repetitions: z.number().int().nonnegative(),
      lapses: z.number().int().nonnegative(),
      version: z.number().int().nonnegative(),
    })
    .strict(),
  reviews: z
    .object({
      id,
      card_id: id,
      quality: z.number().int().min(0).max(5),
      response: text,
      reviewed_at: date,
      interval: z.number().nonnegative(),
    })
    .strict(),
  lessons: z
    .object({
      id,
      title: text,
      group_name: text,
      description: text,
      body: text,
      examples: z.array(text),
      position: z.number().int().nonnegative(),
    })
    .strict(),
  lesson_progress: z.object({ lesson_id: id, completed: z.boolean(), updated_at: date }).strict(),
  questions: z
    .object({
      id,
      article_id: id.nullable(),
      lesson_id: id.nullable(),
      type: text,
      prompt: text,
      options: z.array(text),
      answer: text,
      explanation: text,
      evidence: text,
      subjective: z.boolean(),
      ai_generated: z.boolean(),
    })
    .strict(),
  attempts: z
    .object({
      id,
      question_id: id,
      response: text,
      evidence: text,
      correct: z.boolean().nullable(),
      created_at: date,
    })
    .strict(),
  mistakes: z
    .object({
      id,
      attempt_id: id.nullable(),
      topic: text,
      prompt: text,
      response: text,
      feedback: text,
      subjective: z.boolean(),
      resolved: z.boolean(),
      created_at: date,
    })
    .strict(),
  settings: z.object({ id: z.literal('profile'), value: settingsInput }).strict(),
};
export async function exportData() {
  await initialise();
  const connection = await db();
  return connection.transaction(async (q) => {
    await q('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    const tables: Record<string, unknown[]> = {};
    for (const table of learningTables) tables[table] = await q('SELECT * FROM "' + table + '"');
    return { format: 'margin-backup', version: 1, exported_at: new Date().toISOString(), tables };
  });
}
export async function restoreData(input: unknown) {
  const payload = z
    .object({
      format: z.literal('margin-backup'),
      version: z.literal(1),
      exported_at: date,
      tables: z
        .object(Object.fromEntries(learningTables.map((t) => [t, z.array(schemas[t]).max(100000)])))
        .strict(),
    })
    .strict()
    .parse(input);
  const rows = payload.tables as Record<string, Record<string, unknown>[]>;
  if (rows.settings.length !== 1) throw new AppError(400, 'The backup must contain one profile.');
  for (const entry of rows.entries)
    if (entry.normalized !== normalize(String(entry.term)))
      throw new AppError(400, 'The backup has an invalid entry identity.');
  for (const a of rows.annotations) {
    const article = rows.articles.find((r) => r.id === a.article_id);
    if (!article || String(article.content).slice(Number(a.start), Number(a.end)) !== a.quote)
      throw new AppError(400, 'The backup contains an invalid passage anchor.');
  }
  const connection = await db();
  await connection.transaction(async (q) => {
    for (const table of [...learningTables].reverse()) await q('DELETE FROM "' + table + '"');
    // Insert in dependency order. Any missing reference aborts the entire restore.
    for (const table of [
      'articles',
      'lessons',
      'entries',
      'cards',
      'reviews',
      'annotations',
      'lesson_progress',
      'questions',
      'attempts',
      'mistakes',
      'settings',
    ])
      for (const row of rows[table]) await insert(q, table, row);
  });
}
