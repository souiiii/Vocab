import { z } from 'zod';
const str = z.string().trim().max(10000),
  short = z.string().trim().max(500);
export const articleInput = z.object({
  title: short.min(1),
  author: short.default(''),
  source: short.default('Personal library'),
  url: z.union([z.literal(''), z.url()]).default(''),
  published: short.default(''),
  category: short.default('Uncategorised'),
  content: z.string().trim().min(20).max(500000),
});
export const annotationInput = z
  .object({
    article_id: short.min(1),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    quote: z.string().min(1).max(20000),
    note: str.default(''),
    kind: z.enum(['highlight', 'grammar']).default('highlight'),
  })
  .refine((a) => a.end > a.start, 'Invalid selection');
export const entryInput = z.object({
  term: short.min(1),
  kind: z.enum(['word', 'expression', 'grammar', 'construction']).default('word'),
  meaning: str.min(1),
  pos: short.default(''),
  context_meaning: str.default(''),
  sentence: str.default(''),
  article_id: short.nullable().default(null),
  synonyms: str.default(''),
  antonyms: str.default(''),
  collocations: str.default(''),
  forms: str.default(''),
  register: short.default('neutral'),
  pronunciation: short.default(''),
  examples: str.default(''),
  tags: short.default(''),
  status: z.enum(['new', 'learning', 'familiar']).default('new'),
});
export const questionInput = z
  .object({
    article_id: short.min(1),
    type: z.enum([
      'factual',
      'main idea',
      'inference',
      'tone & purpose',
      'assumption',
      'critical reasoning',
      'summary',
    ]),
    prompt: str.min(5),
    options: z.array(short.min(1)).max(6).default([]),
    answer: str.min(1),
    explanation: str.min(1),
    evidence: str.min(1),
    subjective: z.boolean().default(false),
    ai_generated: z.boolean().default(false),
  })
  .refine(
    (q) => q.subjective || (q.options.length >= 2 && q.options.includes(q.answer)),
    'Objective questions need options including the answer',
  )
  .refine(
    (q) => q.subjective || new Set(q.options).size === q.options.length,
    'Options must be distinct',
  );
export const settingsInput = z.object({
  name: short.min(1),
  theme: z.enum(['light', 'dark', 'sepia']),
  fontSize: z.number().min(16).max(30),
  lineHeight: z.number().min(1.4).max(2.4),
  readingWidth: z.number().min(500).max(950),
  font: z.enum(['serif', 'sans']),
});
export const reviewInput = z.object({
  card_id: short.min(1),
  quality: z.number().int().min(0).max(5),
  version: z.number().int().nonnegative(),
  response: str.default(''),
});
export const attemptInput = z.object({
  question_id: short.min(1),
  response: str.min(1),
  evidence: str.default(''),
  self_assessment: z.enum(['sound', 'revisit']).optional(),
});
export const normalize = (term: string) =>
  term.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
