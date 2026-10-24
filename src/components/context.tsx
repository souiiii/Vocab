'use client';
import { createContext, useContext } from 'react';
import type { Snapshot, Entry, Article } from '@/lib/types';
export type View =
  | 'today'
  | 'reader'
  | 'collection'
  | 'grammar'
  | 'sentence'
  | 'comprehension'
  | 'review'
  | 'mistakes'
  | 'settings';
export type Context = {
  data: Snapshot;
  refresh: () => Promise<void>;
  run: <T = unknown>(action: string, data: unknown) => Promise<T>;
  notify: (message: string, error?: boolean) => void;
  go: (view: View) => void;
  openArticle: (article: Article) => void;
  editEntry: (entry?: Partial<Entry>) => void;
  busy: boolean;
};
export const WorkspaceContext = createContext<Context | null>(null);
export function useWorkspace() {
  const c = useContext(WorkspaceContext);
  if (!c) throw new Error('Workspace provider missing');
  return c;
}
export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: 'no-store', ...options });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'The request failed. Please try again.');
  return data;
}
