export type Article = {
  id: string;
  title: string;
  author: string;
  source: string;
  url: string;
  published: string;
  category: string;
  content: string;
  status: 'unread' | 'reading' | 'finished';
  progress: number;
  created_at: string;
};
export type Annotation = {
  id: string;
  article_id: string;
  start: number;
  end: number;
  quote: string;
  note: string;
  kind: 'highlight' | 'grammar';
  created_at: string;
};
export type Entry = {
  id: string;
  term: string;
  normalized: string;
  kind: 'word' | 'expression' | 'grammar' | 'construction';
  meaning: string;
  pos: string;
  context_meaning: string;
  sentence: string;
  article_id: string | null;
  synonyms: string;
  antonyms: string;
  collocations: string;
  forms: string;
  register: string;
  pronunciation: string;
  examples: string;
  tags: string;
  status: 'new' | 'learning' | 'familiar';
  created_at: string;
};
export type Card = {
  id: string;
  entry_id: string;
  format: string;
  due_at: string;
  interval: number;
  ease: number;
  repetitions: number;
  lapses: number;
  version: number;
};
export type Review = {
  id: string;
  card_id: string;
  quality: number;
  response: string;
  reviewed_at: string;
  interval: number;
};
export type QuestionType =
  | 'factual'
  | 'main idea'
  | 'inference'
  | 'tone & purpose'
  | 'assumption'
  | 'critical reasoning'
  | 'summary';
export type Question = {
  id: string;
  article_id: string | null;
  lesson_id: string | null;
  type: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  evidence: string;
  subjective: boolean;
  ai_generated: boolean;
};
export type Attempt = {
  id: string;
  question_id: string;
  response: string;
  evidence: string;
  correct: boolean | null;
  created_at: string;
};
export type Mistake = {
  id: string;
  attempt_id: string | null;
  topic: string;
  prompt: string;
  response: string;
  feedback: string;
  subjective: boolean;
  resolved: boolean;
  created_at: string;
};
export type Lesson = {
  id: string;
  title: string;
  group_name: string;
  description: string;
  body: string;
  examples: string[];
  position: number;
};
export type LessonProgress = { lesson_id: string; completed: boolean; updated_at: string };
export type Settings = {
  name: string;
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  lineHeight: number;
  readingWidth: number;
  font: 'serif' | 'sans';
};
export type Snapshot = {
  articles: Article[];
  annotations: Annotation[];
  entries: Entry[];
  cards: Card[];
  reviews: Review[];
  questions: Question[];
  attempts: Attempt[];
  mistakes: Mistake[];
  lessons: Lesson[];
  lesson_progress: LessonProgress[];
  settings: Settings;
  database: 'local' | 'neon';
};
