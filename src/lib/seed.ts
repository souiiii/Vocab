import content from './content.json';
import type { Article, Entry, Lesson, Question } from './types';
export const starterArticles = content.articles as Article[];
export const starterEntries = content.entries as Entry[];
export const starterLessons = content.lessons as Lesson[];
export const starterQuestions = content.questions as Question[];
export const defaultSettings = {
  name: 'Shahid',
  theme: 'light' as const,
  fontSize: 21,
  lineHeight: 1.9,
  readingWidth: 700,
  font: 'serif' as const,
};
