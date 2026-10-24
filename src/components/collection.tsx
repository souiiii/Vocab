'use client';
import { useState, useCallback } from 'react';
import {
  Plus,
  Search,
  ArrowUpRight,
  Trash2,
  Merge,
  Volume2,
  Bookmark,
  ArrowRight,
} from 'lucide-react';
import type { Entry } from '@/lib/types';
import { useWorkspace } from './context';
import { AIHelp } from './ai-help';
import { Button, Modal, Field, Tag, Empty, dateLabel } from './ui';
const blank: Omit<Entry, 'id' | 'normalized' | 'created_at'> = {
  term: '',
  kind: 'word',
  meaning: '',
  pos: '',
  context_meaning: '',
  sentence: '',
  article_id: null,
  synonyms: '',
  antonyms: '',
  collocations: '',
  forms: '',
  register: 'neutral',
  pronunciation: '',
  examples: '',
  tags: '',
  status: 'new',
};
export function EntryDialog({
  initial,
  onClose,
}: {
  initial: Partial<Entry>;
  onClose: () => void;
}) {
  const { data, run, busy, notify } = useWorkspace(),
    [draft, setDraft] = useState({ ...blank, ...initial }),
    [merge, setMerge] = useState('');
  const field = (key: keyof typeof blank, label: string, multiline = false) => (
    <Field label={label}>
      {multiline ? (
        <textarea
          rows={3}
          value={String(draft[key] || '')}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      ) : (
        <input
          value={String(draft[key] || '')}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      )}
    </Field>
  );
  const reviews = data.reviews
    .filter((r) => data.cards.some((c) => c.id === r.card_id && c.entry_id === initial.id))
    .sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at));
  return (
    <Modal
      title={initial.id ? 'A word, in your own terms' : 'Keep something worth knowing'}
      onClose={onClose}
      wide
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await run('entry.save', draft);
            notify(initial.id ? 'Entry updated.' : 'Added to your collection and review queue.');
            onClose();
          } catch {}
        }}
      >
        <div className="form-grid">
          <Field label="Word or expression">
            <input
              required
              autoFocus
              value={draft.term}
              onChange={(e) => setDraft({ ...draft, term: e.target.value })}
            />
          </Field>
          <Field label="Collection">
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as Entry['kind'] })}
            >
              {['word', 'expression', 'grammar', 'construction'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Meaning or rule">
          <textarea
            required
            rows={2}
            value={draft.meaning}
            placeholder="Explain it in words that make sense to you."
            onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          {field('pos', 'Part of speech')}
          {field('pronunciation', 'Pronunciation (if known)')}
        </div>
        {field('context_meaning', 'Meaning in this context')}
        {field('sentence', 'Original sentence', true)}
        <Field label="Source article">
          <select
            value={draft.article_id || ''}
            onChange={(e) => setDraft({ ...draft, article_id: e.target.value || null })}
          >
            <option value="">No linked article</option>
            {data.articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </Field>
        <details className="entry-details" open={!!initial.id}>
          <summary>Usage, relationships & personal examples</summary>
          <div className="form-grid">
            {field('synonyms', 'Synonyms')}
            {field('antonyms', 'Antonyms')}
            {field('collocations', 'Collocations')}
            {field('forms', 'Related forms')}
            {field('register', 'Register / formality')}
            {field('tags', 'Tags (comma-separated)')}
          </div>
          {field('examples', 'Your own example sentences', true)}
        </details>
        <Field label="Learning status">
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as Entry['status'] })}
          >
            {['new', 'learning', 'familiar'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {initial.id && (
          <details className="entry-details">
            <summary>Review history · {reviews.length} reviews</summary>
            {reviews.length ? (
              reviews.slice(0, 20).map((r) => (
                <div className="history-row" key={r.id}>
                  <span>
                    {dateLabel(r.reviewed_at)} · Quality {r.quality}/5
                  </span>
                  <span>Next interval: {r.interval} days</span>
                  {r.response && <p>{r.response}</p>}
                </div>
              ))
            ) : (
              <p className="muted">Your recall history will appear here after your first review.</p>
            )}
          </details>
        )}
        <AIHelp
          task="vocabulary"
          text={draft.term}
          context={draft.sentence}
          onResult={(r) =>
            setDraft({
              ...draft,
              ...Object.fromEntries(
                Object.entries(r).filter(([k, v]) => k in blank && typeof v === 'string'),
              ),
              examples: String(r.example || draft.examples),
            })
          }
        />
        <div className="dialog-footer">
          {initial.id && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm('Delete this entry, its review cards and history?'))
                  run('entry.delete', { id: initial.id })
                    .then(onClose)
                    .catch(() => {});
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          )}
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save to collection <Bookmark size={15} />
          </Button>
        </div>
      </form>
      {initial.id && (
        <details className="merge-section">
          <summary>
            <Merge size={14} /> Merge another entry into this one
          </summary>
          <p className="muted small">
            Examples, meanings and review history are preserved. The other entry is removed.
          </p>
          <select
            aria-label="Entry to merge"
            value={merge}
            onChange={(e) => setMerge(e.target.value)}
          >
            <option value="">Choose an entry…</option>
            {data.entries
              .filter((e) => e.id !== initial.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.term}
                </option>
              ))}
          </select>
          <Button
            variant="secondary"
            disabled={!merge}
            onClick={() => {
              if (confirm('Merge the selected entry into this one?'))
                run('entry.merge', { source: merge, target: initial.id })
                  .then(() => {
                    notify('Entries merged with their review history.');
                    onClose();
                  })
                  .catch(() => {});
            }}
          >
            Merge entries
          </Button>
        </details>
      )}
    </Modal>
  );
}
export function Collection({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (s: string) => void;
}) {
  const { data, editEntry, go } = useWorkspace(),
    [kind, setKind] = useState('all'),
    [status, setStatus] = useState('all'),
    [sort, setSort] = useState('recent');
  const entries = data.entries
    .filter(
      (e) =>
        (kind === 'all' || e.kind === kind) &&
        (status === 'all' || e.status === status) &&
        [e.term, e.meaning, e.tags, e.collocations]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'alphabetical'
        ? a.term.localeCompare(b.term)
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">COLLECT WITH INTENTION</div>
          <h1>
            Words worth keeping<span className="accent-period">.</span>
          </h1>
          <p>Context gives them meaning. Using them makes them yours.</p>
        </div>
        <Button onClick={() => editEntry()}>
          <Plus size={16} /> Add an entry
        </Button>
      </div>
      <div className="collection-toolbar">
        <div className="tabs">
          {['all', 'word', 'expression', 'grammar', 'construction'].map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
              {k === 'all'
                ? 'Everything'
                : k === 'word'
                  ? 'Words'
                  : k === 'expression'
                    ? 'Expressions'
                    : k === 'grammar'
                      ? 'Rules'
                      : 'Constructions'}
            </button>
          ))}
        </div>
        <span className="muted small">{data.entries.length} things noticed</span>
      </div>
      <div className="filter-row">
        <div className="inline-search">
          <Search size={16} />
          <input
            aria-label="Search entries"
            placeholder="Search words, meanings or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by learning status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All learning stages</option>
          {['new', 'learning', 'familiar'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Sort entries" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Recently collected</option>
          <option value="alphabetical">A → Z</option>
        </select>
      </div>
      <div className="entry-grid">
        {entries.map((e) => (
          <button className="entry-card" key={e.id} onClick={() => editEntry(e)}>
            <div className="entry-card-top">
              <Tag
                tone={e.kind === 'expression' ? 'lavender' : e.kind === 'word' ? 'sage' : 'cream'}
              >
                {e.kind}
              </Tag>
              <ArrowUpRight size={16} />
            </div>
            <h2>{e.term}</h2>
            <span className="entry-pos">
              {e.pos}
              {e.register && ' / ' + e.register}
            </span>
            <p>{e.meaning}</p>
            {e.sentence && <blockquote>{e.sentence}</blockquote>}
            <div className="entry-card-bottom">
              <span className={'learning-dot ' + e.status} />
              {e.status}
              <span>{dateLabel(e.created_at)}</span>
            </div>
          </button>
        ))}
      </div>
      {!entries.length && (
        <Empty
          icon={<Bookmark size={28} />}
          title="A little room for discovery"
          detail="Save a word from the reader or add something you want to use."
        >
          <Button onClick={() => editEntry()}>Add your first entry</Button>
        </Empty>
      )}
      <div className="collection-callout">
        <LayersSymbol />
        <div>
          <h3>Let these words find their way back.</h3>
          <p>
            Your collection is connected to spaced review, so a good discovery can become a lasting
            one.
          </p>
        </div>
        <button className="text-link" onClick={() => go('review')}>
          Open review queue <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
}
function LayersSymbol() {
  return <span className="collection-symbol">↻</span>;
}
