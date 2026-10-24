'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  RotateCcw,
  Layers3,
  CheckCircle2,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { useWorkspace } from './context';
import { Button, Tag, Empty, dateLabel } from './ui';
import { recallPrompt, schedule } from '@/lib/srs';
const ratings = [
  { quality: 1, label: 'Again', note: 'Let’s come back to it', key: '1' },
  { quality: 3, label: 'Hard', note: 'Took some effort', key: '2' },
  { quality: 4, label: 'Good', note: 'Came back clearly', key: '3' },
  { quality: 5, label: 'Easy', note: 'Ready to use', key: '4' },
];
export function ReviewSession() {
  const { data, run, busy, notify } = useWorkspace(),
    [revealed, setRevealed] = useState(false),
    [response, setResponse] = useState(''),
    [done, setDone] = useState(0),
    [tab, setTab] = useState('due');
  const now = new Date().toISOString(),
    due = data.cards
      .filter((c) => c.due_at <= now)
      .sort((a, b) => a.due_at.localeCompare(b.due_at)),
    card = due[0],
    entry = data.entries.find((e) => e.id === card?.entry_id),
    prompt = entry && card ? recallPrompt(entry, card.format) : null;
  const submit = useCallback(
    async (quality: number) => {
      if (!card || busy) return;
      try {
        await run('review.submit', { card_id: card.id, quality, version: card.version, response });
        setDone((n) => n + 1);
        setRevealed(false);
        setResponse('');
      } catch {}
    },
    [card, busy, run, response],
  );
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
        e.altKey ||
        e.metaKey ||
        e.ctrlKey
      )
        return;
      if (e.code === 'Space' && card) {
        e.preventDefault();
        setRevealed(true);
      }
      if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        submit(ratings[+e.key - 1].quality);
      }
    }
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [card, revealed, submit]);
  const upcoming = data.cards
    .filter((c) => c.due_at > now)
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const difficult = data.cards.filter((c) => c.lapses > 0).sort((a, b) => b.lapses - a.lapses);
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">A LITTLE RECALL GOES A LONG WAY</div>
          <h1>
            Make it yours<span className="accent-period">.</span>
          </h1>
          <p>Bring an idea back before looking. That small effort is the learning.</p>
        </div>
        <div className="curriculum-count">
          <strong>{due.length}</strong>
          <span>ready to revisit</span>
        </div>
      </div>
      <div className="collection-toolbar">
        <div className="tabs">
          {[
            ['due', 'Today’s review'],
            ['upcoming', 'Coming up'],
            ['difficult', 'Needs a little care'],
          ].map(([k, l]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        <span className="muted small">SM-2 spaced repetition</span>
      </div>
      {tab === 'due' ? (
        card && entry && prompt ? (
          <div className="review-session">
            <div className="review-session-top">
              <span>{done} revisited this session</span>
              <span>
                {due.length} ready <span className="tiny-line" />{' '}
                {
                  data.cards.filter((c) => c.due_at < new Date(Date.now() - 86400000).toISOString())
                    .length
                }{' '}
                overdue
              </span>
            </div>
            <div className="recall-card">
              <div className="recall-label">
                <Layers3 size={16} />
                {prompt.label}
                <Tag tone="sage">{entry.kind}</Tag>
              </div>
              <h2 className={prompt.prompt.length > 80 ? 'long-prompt' : ''}>{prompt.prompt}</h2>
              {card.format === 'word-meaning' && entry.pos && (
                <span className="entry-pos">{entry.pos}</span>
              )}
              <textarea
                aria-label="Your recalled answer"
                rows={3}
                placeholder={
                  card.format === 'original' || card.format === 'rewrite'
                    ? 'Try a sentence of your own…'
                    : 'Try to recall it in your own words…'
                }
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              {!revealed ? (
                <Button variant="secondary" onClick={() => setRevealed(true)}>
                  Turn the card <RotateCcw size={15} />
                  <kbd>space</kbd>
                </Button>
              ) : (
                <div className="recall-answer">
                  <span className="overline">A POINT OF REFERENCE</span>
                  <h3>{prompt.answer}</h3>
                  {entry.sentence && <blockquote>{entry.sentence}</blockquote>}
                  {entry.examples && <p>Your examples: {entry.examples}</p>}
                  {entry.collocations && <small>Often found with: {entry.collocations}</small>}
                  {['original', 'rewrite'].includes(card.format) && (
                    <p className="muted small">
                      Assess your own usage against the rule and context. This is a reflection, not
                      an automatic writing grade.
                    </p>
                  )}
                </div>
              )}
            </div>
            {revealed && (
              <div className="rating-section">
                <span className="overline">HOW DID THAT FEEL?</span>
                <div className="rating-grid">
                  {ratings.map((r) => (
                    <button
                      key={r.key}
                      className={'rating rating-' + r.key}
                      disabled={busy}
                      onClick={() => submit(r.quality)}
                    >
                      <kbd>{r.key}</kbd>
                      <strong>{r.label}</strong>
                      <small>{r.note}</small>
                      <span>
                        {schedule(card, r.quality).interval} day
                        {schedule(card, r.quality).interval === 1 ? '' : 's'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="review-session-note">
              Honest recall makes the schedule useful. Nothing to prove, just something to remember.
            </p>
          </div>
        ) : (
          <Empty
            icon={<CheckCircle2 size={38} />}
            title={done ? 'A little more familiar.' : 'A little breathing room.'}
            detail={
              done
                ? done +
                  ' thoughtful reviews saved. Your next sessions are scheduled automatically.'
                : 'Nothing is due right now. Keep reading and your next useful discovery will find its way here.'
            }
          >
            <Button onClick={() => setTab('upcoming')}>
              See what’s coming up <ArrowRight size={15} />
            </Button>
          </Empty>
        )
      ) : (
        <div className="panel review-list">
          {(tab === 'upcoming' ? upcoming : difficult).map((c) => {
            const e = data.entries.find((e) => e.id === c.entry_id);
            return (
              <div className="review-list-row" key={c.id}>
                <div>
                  <strong>{e?.term}</strong>
                  <span>{c.format.replaceAll('-', ' → ')}</span>
                </div>
                <Tag tone={c.lapses ? 'cream' : 'sage'}>
                  {tab === 'difficult' ? c.lapses + ' lapses' : dateLabel(c.due_at)}
                </Tag>
                <span className="small muted">{c.interval} day interval</span>
              </div>
            );
          })}
          {!(tab === 'upcoming' ? upcoming : difficult).length && (
            <Empty
              icon={<CalendarDays size={26} />}
              title={tab === 'difficult' ? 'No difficult cards yet' : 'No upcoming cards yet'}
              detail="Your review schedule takes shape as you practise."
            />
          )}
        </div>
      )}
    </>
  );
}
