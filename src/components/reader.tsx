'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  ArrowLeft,
  ArrowUpRight,
  Highlighter,
  BookmarkPlus,
  ScanText,
  BookOpen,
  SlidersHorizontal,
  Check,
  Link,
  FileText,
  Trash2,
  StickyNote,
  Search,
  X,
} from 'lucide-react';
import type { Article, Annotation } from '@/lib/types';
import { anchorSelection, segments } from '@/lib/anchors';
import { useWorkspace } from './context';
import { Button, Modal, Field, Tag, Empty, minutes } from './ui';
export function ImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (a: Article) => void;
}) {
  const { run, busy, notify } = useWorkspace(),
    [tab, setTab] = useState('text'),
    [url, setUrl] = useState(''),
    [draft, setDraft] = useState({
      title: '',
      author: '',
      source: 'Personal library',
      url: '',
      published: '',
      category: 'Articles',
      content: '',
    }),
    [extracting, setExtracting] = useState(false);
  async function extract() {
    setExtracting(true);
    try {
      const a = await run<typeof draft>('article.extract', { url });
      setDraft(a);
      setTab('text');
      notify('Article extracted. Review the text before adding it.');
    } catch {
    } finally {
      setExtracting(false);
    }
  }
  return (
    <Modal title="Make room for a good read" onClose={onClose} wide>
      <p className="dialog-intro">
        An interesting article. A passage from your book. Bring it into your reading room.
      </p>
      <div className="tabs">
        <button className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>
          <FileText size={16} /> Paste text
        </button>
        <button className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>
          <Link size={16} /> Import a link
        </button>
      </div>
      {tab === 'url' ? (
        <div className="form-stack">
          <Field label="Article URL">
            <input
              type="url"
              autoFocus
              placeholder="https://example.com/an-interesting-essay"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
          <div className="notice">
            Public articles only. Some sites restrict extraction; you can always paste text you have
            permission to use.
          </div>
          <Button loading={extracting} disabled={!url} onClick={extract}>
            Extract article <ArrowUpRight size={15} />
          </Button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const a = await run<Article>('article.create', draft);
              notify('Added to your reading room.');
              onImported(a);
            } catch {}
          }}
          className="form-stack"
        >
          <Field label="Title">
            <input
              required
              value={draft.title}
              placeholder="A title worth coming back to"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <div className="form-grid">
            <Field label="Author">
              <input
                value={draft.author}
                onChange={(e) => setDraft({ ...draft, author: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </Field>
            <Field label="Source">
              <input
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              />
            </Field>
            <Field label="Publication date">
              <input
                type="date"
                value={draft.published.slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, published: e.target.value })}
              />
            </Field>
          </div>
          <Field
            label="Article text"
            hint="Plain text keeps the reading experience clean. Your saved text stays stable so annotations remain attached."
          >
            <textarea
              required
              minLength={20}
              rows={11}
              value={draft.content}
              placeholder="Paste your article or book passage here…"
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            />
          </Field>
          <div className="dialog-footer">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={busy} type="submit">
              Add to reading room <Plus size={15} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function Reader({
  article,
  onSelect,
  onImport,
}: {
  article: Article | null;
  onSelect: (a: Article | null) => void;
  onImport: () => void;
}) {
  const { data, run, go, editEntry, notify } = useWorkspace();
  const [filter, setFilter] = useState('all'),
    [search, setSearch] = useState(''),
    [selection, setSelection] = useState<{ start: number; end: number; quote: string } | null>(
      null,
    ),
    [controls, setControls] = useState(false),
    [notes, setNotes] = useState(true),
    [editingNote, setEditingNote] = useState<Annotation | null>(null),
    [noteValue, setNoteValue] = useState('');
  const reading = useRef<HTMLDivElement>(null),
    scroller = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const changed = () => {
      const selection = window.getSelection();
      if (selection?.toString() && reading.current) {
        const anchor = anchorSelection(reading.current, selection);
        if (anchor) setSelection(anchor);
      }
    };
    document.addEventListener('selectionchange', changed);
    return () => document.removeEventListener('selectionchange', changed);
  }, []);
  useEffect(() => {
    setSelection(null);
    if (article && scroller.current) {
      const node = scroller.current;
      requestAnimationFrame(
        () =>
          (node.scrollTop =
            (article.progress / 100) * Math.max(0, node.scrollHeight - node.clientHeight)),
      );
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [article?.id]);
  const closeNote = useCallback(() => setEditingNote(null), []);
  const saveProgress = () => {
    const node = scroller.current;
    if (!node || !article || node.scrollHeight <= node.clientHeight) return;
    const progress = Math.min(
      99,
      Math.round((node.scrollTop / (node.scrollHeight - node.clientHeight)) * 100),
    );
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        run('article.progress', {
          id: article.id,
          progress: article.status === 'finished' ? 100 : progress,
          status: article.status === 'finished' ? 'finished' : 'reading',
        }).catch(() => {}),
      600,
    );
  };
  async function highlight(kind = 'highlight') {
    if (!article || !selection) return;
    try {
      await run('annotation.create', { ...selection, article_id: article.id, kind });
      notify('Passage saved with its original context.');
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch {}
  }
  if (!article) {
    const filtered = data.articles.filter(
      (a) =>
        (filter === 'all' || a.status === filter) &&
        [a.title, a.author, a.category].join(' ').toLowerCase().includes(search.toLowerCase()),
    );
    return (
      <>
        <div className="page-heading compact">
          <div>
            <div className="eyebrow">EXPOSURE COMES FIRST</div>
            <h1>
              Your reading room<span className="accent-period">.</span>
            </h1>
            <p>A few good pieces. All the space you need to think.</p>
          </div>
          <Button onClick={onImport}>
            <Plus size={16} /> Add a read
          </Button>
        </div>
        <div className="collection-toolbar">
          <div className="tabs">
            {['all', 'reading', 'unread', 'finished'].map((s) => (
              <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>
                {s === 'all' ? 'All reading' : s}
              </button>
            ))}
          </div>
          <div className="inline-search">
            <Search size={16} />
            <input
              aria-label="Search articles"
              placeholder="Find a piece…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="article-grid">
          {filtered.map((a, i) => (
            <article className="article-card" key={a.id}>
              <div className={'article-art art-' + (i % 3)} aria-hidden="true">
                <span>{a.category.toUpperCase()}</span>
                <div>{i % 3 === 0 ? 'Aa' : i % 3 === 1 ? '“ ”' : '∿'}</div>
                <span>THE PLEASURE OF A CLOSER LOOK</span>
              </div>
              <div className="article-card-body">
                <div className="article-card-meta">
                  <Tag tone="sage">{a.status}</Tag>
                  <span>{minutes(a.content)} min read</span>
                </div>
                <h2>
                  <button onClick={() => onSelect(a)}>{a.title}</button>
                </h2>
                <p>{a.content.slice(0, 125)}…</p>
                <div className="article-byline">{a.author || a.source}</div>
                <div className="article-actions">
                  <button className="text-link" onClick={() => onSelect(a)}>
                    {a.status === 'reading' ? 'Continue reading' : 'Open in reader'}
                    <ArrowUpRight size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={'Delete ' + a.title}
                    onClick={() => {
                      if (
                        confirm(
                          'Delete this article and its annotations? Linked vocabulary will be kept.',
                        )
                      )
                        run('article.delete', { id: a.id }).catch(() => {});
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {a.progress > 0 && (
                  <div className="progress-track">
                    <i style={{ width: a.progress + '%' }} />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <Empty
            icon={<BookOpen size={28} />}
            title="A little space for your next read"
            detail="Import a public article or paste a passage to begin."
          >
            <Button onClick={onImport}>Add something to read</Button>
          </Empty>
        )}
      </>
    );
  }
  const annotations = data.annotations.filter((a) => a.article_id === article.id);
  return (
    <>
      <div className="reader-top">
        <button className="text-link" onClick={() => onSelect(null)}>
          <ArrowLeft size={16} /> Reading room
        </button>
        <div>
          <Tag tone="sage">{article.status}</Tag>
          <button
            className="icon-button"
            aria-label="Reading appearance"
            onClick={() => setControls(!controls)}
          >
            <SlidersHorizontal size={18} />
          </button>
          <button
            className={'icon-button ' + (notes ? 'selected' : '')}
            aria-label="Toggle annotations"
            onClick={() => setNotes(!notes)}
          >
            <StickyNote size={18} />
          </button>
        </div>
      </div>
      {controls && (
        <div className="reading-controls">
          <Field label="Text size">
            <input
              type="range"
              min="16"
              max="30"
              value={data.settings.fontSize}
              onChange={(e) =>
                run('settings.save', { ...data.settings, fontSize: +e.target.value }).catch(
                  () => {},
                )
              }
            />
          </Field>
          <Field label="Line spacing">
            <select
              value={data.settings.lineHeight}
              onChange={(e) =>
                run('settings.save', { ...data.settings, lineHeight: +e.target.value }).catch(
                  () => {},
                )
              }
            >
              {[1.5, 1.7, 1.9, 2.1, 2.3].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Reading width">
            <select
              value={data.settings.readingWidth}
              onChange={(e) =>
                run('settings.save', { ...data.settings, readingWidth: +e.target.value }).catch(
                  () => {},
                )
              }
            >
              {[550, 700, 850].map((v) => (
                <option key={v} value={v}>
                  {v}px
                </option>
              ))}
            </select>
          </Field>
          <Field label="Typeface">
            <select
              value={data.settings.font}
              onChange={(e) =>
                run('settings.save', { ...data.settings, font: e.target.value }).catch(() => {})
              }
            >
              <option value="serif">Literary serif</option>
              <option value="sans">Clean sans</option>
            </select>
          </Field>
          <Field label="Theme">
            <select
              value={data.settings.theme}
              onChange={(e) =>
                run('settings.save', { ...data.settings, theme: e.target.value }).catch(() => {})
              }
            >
              {['light', 'sepia', 'dark'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <div className={'reader-layout ' + (!notes ? 'notes-hidden' : '')}>
        <section className="reader-paper">
          <div className="reader-scroll" ref={scroller} onScroll={saveProgress}>
            <div className="reader-inner" style={{ maxWidth: data.settings.readingWidth }}>
              <div className="eyebrow">
                {article.category} <span> / </span> {minutes(article.content)} MIN READ
              </div>
              <h1>{article.title}</h1>
              <div className="reader-byline">
                {article.author && <strong>{article.author}</strong>}
                <span>{article.source}</span>
                {article.published && <span>{article.published.slice(0, 10)}</span>}
                {article.url && (
                  <a href={article.url} target="_blank" rel="noreferrer">
                    Original source <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
              <div className="reader-rule" />
              <div
                ref={reading}
                data-testid="article-content"
                className={'article-content ' + data.settings.font}
                style={{ fontSize: data.settings.fontSize, lineHeight: data.settings.lineHeight }}
                onMouseUp={() => {
                  const selected = window.getSelection();
                  if (selected && reading.current)
                    setSelection(anchorSelection(reading.current, selected));
                }}
                onKeyUp={() => {
                  const selected = window.getSelection();
                  if (selected && reading.current)
                    setSelection(anchorSelection(reading.current, selected));
                }}
              >
                {segments(article.content, annotations).map((s) =>
                  s.annotations.length ? (
                    <mark
                      key={s.start}
                      className={
                        s.annotations.some((a) => a.kind === 'grammar') ? 'grammar-mark' : ''
                      }
                      title={s.annotations.map((a) => a.note || a.kind).join(' · ')}
                    >
                      {s.text}
                    </mark>
                  ) : (
                    <span key={s.start}>{s.text}</span>
                  ),
                )}
              </div>
              <div className="reading-end">
                <span>✳</span>
                <p>Take a moment. What stayed with you?</p>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      run('article.progress', { id: article.id, progress: 100, status: 'finished' })
                        .then(() => notify('Reading marked as finished.'))
                        .catch(() => {})
                    }
                  >
                    <Check size={15} /> Mark as finished
                  </Button>
                  <Button
                    onClick={() => {
                      sessionStorage.setItem('margin-practice-article', article.id);
                      go('comprehension');
                    }}
                  >
                    Explore the ideas <ArrowRightIcon />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="reader-bottom">
            <span>{Math.round(article.progress)}% through this piece</span>
            <span>Select a passage to highlight, collect or explore.</span>
          </div>
        </section>
        {notes && (
          <aside className="annotation-panel">
            <div className="section-heading">
              <h2>In the margins</h2>
              <span>{annotations.length}</span>
            </div>
            <p className="muted small">Your thoughts, held beside the text.</p>
            {annotations.length ? (
              annotations.map((a) => (
                <div className="annotation-card" key={a.id}>
                  <Tag tone={a.kind === 'grammar' ? 'lavender' : 'cream'}>
                    {a.kind === 'grammar' ? 'Construction' : 'Highlight'}
                  </Tag>
                  <blockquote>{a.quote}</blockquote>
                  {a.note && <p>{a.note}</p>}
                  <div>
                    <button
                      className="text-link"
                      onClick={() => {
                        setEditingNote(a);
                        setNoteValue(a.note);
                      }}
                    >
                      {a.note ? 'Edit note' : '+ Add a thought'}
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Delete annotation"
                      onClick={() => run('annotation.delete', { id: a.id }).catch(() => {})}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="annotation-empty">
                <Highlighter size={25} />
                <h3>Notice something?</h3>
                <p>
                  Select a word or sentence.
                  <br />
                  Make a little mark of your own.
                </p>
              </div>
            )}
            <button
              className="text-link"
              onClick={() => {
                sessionStorage.setItem('margin-sentence', article.content.split(/[.!?]/)[0] + '.');
                go('sentence');
              }}
            >
              Open sentence lab <ArrowUpRight size={14} />
            </button>
          </aside>
        )}
      </div>
      {selection && (
        <div className="selection-bar" role="toolbar" aria-label="Selected passage actions">
          <span>
            {selection.quote.length > 35 ? selection.quote.slice(0, 35) + '…' : selection.quote}
          </span>
          <Button variant="ghost" onClick={() => highlight()}>
            <Highlighter size={16} /> Highlight
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const text = selection.quote;
              editEntry({
                term: text.length < 150 ? text : '',
                sentence: text,
                article_id: article.id,
                kind: text.trim().includes(' ') ? 'expression' : 'word',
              });
              setSelection(null);
            }}
          >
            <BookmarkPlus size={16} /> Collect
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              sessionStorage.setItem('margin-sentence', selection.quote);
              sessionStorage.setItem('margin-sentence-source', article.id);
              go('sentence');
            }}
          >
            <ScanText size={16} /> Analyse
          </Button>
          <button
            className="icon-button"
            aria-label="Dismiss selection"
            onClick={() => setSelection(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {editingNote && (
        <Modal title="A thought in the margin" onClose={closeNote}>
          <blockquote className="quote-box">{editingNote.quote}</blockquote>
          <Field label="Your note">
            <textarea rows={5} value={noteValue} onChange={(e) => setNoteValue(e.target.value)} />
          </Field>
          <div className="dialog-footer">
            <Button
              onClick={() =>
                run('annotation.update', { id: editingNote.id, note: noteValue })
                  .then(closeNote)
                  .catch(() => {})
              }
            >
              Save note
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}
