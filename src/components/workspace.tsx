'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  Library,
  NotebookPen,
  Braces,
  ScanText,
  Layers3,
  Settings,
  Search,
  Sun,
  Moon,
  ArrowUpRight,
  ChevronRight,
  Menu,
  X,
  Feather,
  Loader2,
  Plus,
  Command,
} from 'lucide-react';
import type { Snapshot, Entry, Article } from '@/lib/types';
import { WorkspaceContext, request, type View } from './context';
import { Button } from './ui';
import { Dashboard } from './dashboard';
import { Reader, ImportDialog } from './reader';
import { Collection, EntryDialog } from './collection';
import { Grammar, SentenceLab, Comprehension, Mistakes } from './study';
import { ReviewSession } from './review';
import { SettingsPage } from './settings';
const groups = [
  {
    label: 'YOUR WORKSPACE',
    items: [
      ['today', 'Today', LayoutDashboard],
      ['reader', 'Reading room', BookOpen],
      ['collection', 'My collection', Library],
    ],
  },
  {
    label: 'EXPLORE THE LANGUAGE',
    items: [
      ['grammar', 'Grammar studio', Braces],
      ['sentence', 'Sentence lab', ScanText],
      ['comprehension', 'Comprehension', NotebookPen],
    ],
  },
  {
    label: 'MAKE IT LAST',
    items: [
      ['review', 'Daily review', Layers3],
      ['mistakes', 'Mistake notebook', Feather],
    ],
  },
] as const;
export function Workspace() {
  const [data, setData] = useState<Snapshot | null>(null),
    [loadError, setLoadError] = useState(''),
    [view, setView] = useState<View>('today'),
    [article, setArticle] = useState<Article | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [entry, setEntry] = useState<Partial<Entry> | null>(null),
    [toast, setToast] = useState<{ text: string; error: boolean } | null>(null),
    [pending, setPending] = useState(0),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const refresh = useCallback(async () => {
    try {
      setData(await request<Snapshot>('/api/workspace'));
      setLoadError('');
    } catch (e) {
      setLoadError((e as Error).message);
      throw e;
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => {});
    const v = new URLSearchParams(location.search).get('view');
    if ((v && groups.some((g) => g.items.some((i) => i[0] === v))) || v === 'settings')
      setView(v as View);
    const connection = new URLSearchParams(location.search).get('connection');
    if (connection) notify(connection);
  }, [refresh, notify]);
  useEffect(() => {
    if (!data) return;
    const id = new URLSearchParams(location.search).get('article');
    if (id && !article) {
      const found = data.articles.find((a) => a.id === id);
      if (found) setArticle(found);
    }
  }, [data, article]);
  useEffect(() => {
    if (data) document.documentElement.dataset.theme = data.settings.theme;
  }, [data]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const run = useCallback(
    async <T,>(action: string, input: unknown) => {
      setPending((n) => n + 1);
      try {
        const result = await request<T>('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, data: input }),
        });
        await refresh();
        return result;
      } catch (e) {
        notify((e as Error).message, true);
        throw e;
      } finally {
        setPending((n) => n - 1);
      }
    },
    [refresh, notify],
  );
  const go = useCallback((v: View) => {
    setView(v);
    setMobile(false);
    const url = new URL(location.href);
    url.searchParams.set('view', v);
    url.searchParams.delete('connection');
    history.replaceState(null, '', url);
    window.scrollTo({ top: 0 });
  }, []);
  const selectArticle = (a: Article | null) => {
    setArticle(a);
    const url = new URL(location.href);
    if (a) url.searchParams.set('article', a.id);
    else url.searchParams.delete('article');
    history.replaceState(null, '', url);
  };
  const openArticle = (a: Article) => {
    selectArticle(a);
    go('reader');
  };
  const closeImport = useCallback(() => setImportOpen(false), []),
    closeEntry = useCallback(() => setEntry(null), []);
  if (!data)
    return (
      <main className="loading-screen">
        <div className="brand">
          <span className="brand-mark">m</span>margin<span className="brand-dot">.</span>
        </div>
        {loadError ? (
          <>
            <h2>Your workspace couldn’t be opened</h2>
            <p>{loadError}</p>
            <Button onClick={() => refresh().catch(() => {})}>Try again</Button>
          </>
        ) : (
          <>
            <Loader2 className="spin" />
            <p>Making room for a little English…</p>
          </>
        )}
      </main>
    );
  const due = data.cards.filter((c) => c.due_at <= new Date().toISOString()).length;
  const title =
    view === 'settings'
      ? 'Settings'
      : groups.map((g) => g.items.find((i) => i[0] === view)?.[1]).find(Boolean);
  return (
    <WorkspaceContext.Provider
      value={{
        data,
        refresh,
        run,
        notify,
        go,
        openArticle,
        editEntry: (e = {}) => setEntry(e),
        busy: pending > 0,
      }}
    >
      <div className="app-shell">
        {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
        <aside className={'sidebar ' + (mobile ? 'is-open' : '')}>
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              go('today');
            }}
          >
            <span className="brand-mark">m</span>margin<span className="brand-dot">.</span>
          </a>
          <span className="brand-caption">A LITTLE MORE LANGUAGE.</span>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
          <nav aria-label="Main navigation">
            {groups.map((group) => (
              <div className="nav-group" key={group.label}>
                <span className="nav-label">{group.label}</span>
                {group.items.map(([id, label, Icon]) => (
                  <button
                    key={id}
                    className={'nav-item ' + (view === id ? 'active' : '')}
                    aria-current={view === id ? 'page' : undefined}
                    onClick={() => go(id)}
                  >
                    <Icon size={18} strokeWidth={1.6} />
                    <span>{label}</span>
                    {id === 'review' && due > 0 && <span className="nav-count">{due}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="small-star">✳</span>
            <p>
              Language grows
              <br />
              where attention goes.
            </p>
            <span>MAKE YOURSELF AT HOME.</span>
          </div>
          <div className="sidebar-bottom">
            <button
              className={'nav-item ' + (view === 'settings' ? 'active' : '')}
              onClick={() => go('settings')}
            >
              <Settings size={18} />
              <span>Settings & connections</span>
            </button>
            <div className="profile">
              <span className="avatar">{data.settings.name[0].toUpperCase()}</span>
              <div>
                <strong>{data.settings.name}’s workspace</strong>
                <small>
                  Personal edition <span className="online-dot" />
                </small>
              </div>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="mobile-menu icon-button"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <Menu size={20} />
              </button>
              <span>My workspace</span>
              <ChevronRight size={13} />
              <strong>{title}</strong>
            </div>
            <div className="topbar-actions">
              <form
                className="global-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  go('collection');
                }}
              >
                <Search size={15} />
                <input
                  ref={searchRef}
                  aria-label="Search your collection"
                  placeholder="Find a word or expression…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span>
                  <Command size={11} /> K
                </span>
              </form>
              <button
                className="icon-button"
                aria-label="Toggle dark theme"
                onClick={() =>
                  run('settings.save', {
                    ...data.settings,
                    theme: data.settings.theme === 'dark' ? 'light' : 'dark',
                  }).catch(() => {})
                }
              >
                {data.settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <span className="top-avatar">{data.settings.name[0]}</span>
            </div>
          </header>
          <main className={'workspace-content view-' + view}>
            {loadError && (
              <div className="notice error" role="alert">
                {loadError}
                <Button variant="ghost" onClick={() => refresh().catch(() => {})}>
                  Retry connection
                </Button>
              </div>
            )}
            {view === 'today' && <Dashboard onImport={() => setImportOpen(true)} />}
            {view === 'reader' && (
              <Reader
                article={article ? data.articles.find((a) => a.id === article.id) || null : null}
                onSelect={selectArticle}
                onImport={() => setImportOpen(true)}
              />
            )}
            {view === 'collection' && <Collection search={search} setSearch={setSearch} />}
            {view === 'grammar' && <Grammar />}
            {view === 'sentence' && <SentenceLab />}
            {view === 'comprehension' && <Comprehension />}
            {view === 'review' && <ReviewSession />}
            {view === 'mistakes' && <Mistakes />}
            {view === 'settings' && <SettingsPage />}
          </main>
          <footer className="workspace-footer">
            <span>Read deeply. Notice more. Make it yours.</span>
            <span>
              <span className="online-dot" />
              {data.database === 'local' ? 'Saved to local PostgreSQL' : 'Connected to PostgreSQL'}
              <span className="footer-divider">/</span>YOUR SPACE TO GROW
            </span>
          </footer>
        </div>
        {importOpen && (
          <ImportDialog
            onClose={closeImport}
            onImported={(a) => {
              closeImport();
              openArticle(a);
            }}
          />
        )}
        {entry && <EntryDialog initial={entry} onClose={closeEntry} />}
        {toast && (
          <div
            className={'toast ' + (toast.error ? 'error' : '')}
            role={toast.error ? 'alert' : 'status'}
          >
            <span>{toast.text}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
