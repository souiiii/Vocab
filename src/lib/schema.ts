import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
export const articles = pgTable(
  'articles',
  {
    id: text().primaryKey(),
    title: text().notNull(),
    author: text().notNull(),
    source: text().notNull(),
    url: text().notNull(),
    published: text().notNull(),
    category: text().notNull(),
    content: text().notNull(),
    status: text().notNull(),
    progress: real().notNull(),
    created_at: text().notNull(),
  },
  (t) => [
    check('article_progress', sql`${t.progress} >= 0 AND ${t.progress} <= 100`),
    uniqueIndex('article_url_identity')
      .on(t.url)
      .where(sql`${t.url} <> ''`),
  ],
);
export const annotations = pgTable(
  'annotations',
  {
    id: text().primaryKey(),
    article_id: text()
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    start: integer().notNull(),
    end: integer().notNull(),
    quote: text().notNull(),
    note: text().notNull(),
    kind: text().notNull(),
    created_at: text().notNull(),
  },
  (t) => [check('anchor_range', sql`${t.start} >= 0 AND ${t.end} > ${t.start}`)],
);
export const entries = pgTable(
  'entries',
  {
    id: text().primaryKey(),
    term: text().notNull(),
    normalized: text().notNull(),
    kind: text().notNull(),
    meaning: text().notNull(),
    pos: text().notNull(),
    context_meaning: text().notNull(),
    sentence: text().notNull(),
    article_id: text().references(() => articles.id, { onDelete: 'set null' }),
    synonyms: text().notNull(),
    antonyms: text().notNull(),
    collocations: text().notNull(),
    forms: text().notNull(),
    register: text().notNull(),
    pronunciation: text().notNull(),
    examples: text().notNull(),
    tags: text().notNull(),
    status: text().notNull(),
    created_at: text().notNull(),
  },
  (t) => [uniqueIndex('entry_identity').on(t.normalized, t.kind)],
);
export const cards = pgTable(
  'cards',
  {
    id: text().primaryKey(),
    entry_id: text()
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    format: text().notNull(),
    due_at: text().notNull(),
    interval: real().notNull(),
    ease: real().notNull(),
    repetitions: integer().notNull(),
    lapses: integer().notNull(),
    version: integer().notNull(),
  },
  (t) => [uniqueIndex('card_identity').on(t.entry_id, t.format)],
);
export const reviews = pgTable(
  'reviews',
  {
    id: text().primaryKey(),
    card_id: text()
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    quality: integer().notNull(),
    response: text().notNull(),
    reviewed_at: text().notNull(),
    interval: real().notNull(),
  },
  (t) => [check('review_quality', sql`${t.quality} >= 0 AND ${t.quality} <= 5`)],
);
export const lessons = pgTable('lessons', {
  id: text().primaryKey(),
  title: text().notNull(),
  group_name: text().notNull(),
  description: text().notNull(),
  body: text().notNull(),
  examples: jsonb().notNull(),
  position: integer().notNull(),
});
export const lessonProgress = pgTable('lesson_progress', {
  lesson_id: text()
    .primaryKey()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  completed: boolean().notNull(),
  updated_at: text().notNull(),
});
export const questions = pgTable('questions', {
  id: text().primaryKey(),
  article_id: text().references(() => articles.id, { onDelete: 'cascade' }),
  lesson_id: text().references(() => lessons.id, { onDelete: 'cascade' }),
  type: text().notNull(),
  prompt: text().notNull(),
  options: jsonb().notNull(),
  answer: text().notNull(),
  explanation: text().notNull(),
  evidence: text().notNull(),
  subjective: boolean().notNull(),
  ai_generated: boolean().notNull(),
});
export const attempts = pgTable('attempts', {
  id: text().primaryKey(),
  question_id: text()
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  response: text().notNull(),
  evidence: text().notNull(),
  correct: boolean(),
  created_at: text().notNull(),
});
export const mistakes = pgTable('mistakes', {
  id: text().primaryKey(),
  attempt_id: text().references(() => attempts.id, { onDelete: 'set null' }),
  topic: text().notNull(),
  prompt: text().notNull(),
  response: text().notNull(),
  feedback: text().notNull(),
  subjective: boolean().notNull(),
  resolved: boolean().notNull(),
  created_at: text().notNull(),
});
export const settings = pgTable('settings', { id: text().primaryKey(), value: jsonb().notNull() });
