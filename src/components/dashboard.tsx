'use client';
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  BookOpen,
  Bookmark,
  Layers3,
  Braces,
  MoveUpRight,
  Quote,
  Clock3,
} from 'lucide-react';
import { useWorkspace } from './context';
import { Button, Tag, SectionTitle, minutes, dateLabel } from './ui';
export function Dashboard({ onImport }: { onImport: () => void }) {
  const { data, go, openArticle, editEntry } = useWorkspace();
  const due = data.cards.filter((c) => c.due_at <= new Date().toISOString()).length;
  const article =
    data.articles.find((a) => a.status === 'reading') ||
    data.articles.find((a) => a.status !== 'finished');
  const completed = new Set(
      data.lesson_progress.filter((p) => p.completed).map((p) => p.lesson_id),
    ),
    lesson = data.lessons.sort((a, b) => a.position - b.position).find((l) => !completed.has(l.id));
  const recent = [...data.entries]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 4);
  const objective = data.attempts.filter(
    (a) => a.correct !== null && data.questions.some((q) => q.id === a.question_id && q.article_id),
  );
  const accuracy = objective.length
    ? Math.round((objective.filter((a) => a.correct).length / objective.length) * 100)
    : null;
  const retention = data.reviews.length
    ? Math.round((data.reviews.filter((r) => r.quality >= 3).length / data.reviews.length) * 100)
    : null;
  const date = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            YOUR DAILY MARGIN <span className="tiny-line" /> {date}
          </div>
          <h1>
            A little reading.
            <br />
            <span className="muted-serif">A lasting impression.</span>
          </h1>
          <p>Welcome back, {data.settings.name}. Let curiosity set the pace.</p>
        </div>
        <Button variant="secondary" onClick={onImport}>
          <Plus size={16} /> Add something to read
        </Button>
      </div>
      <div className="dashboard-top">
        <section className="reading-feature">
          <div className="feature-copy">
            <span className="overline">
              <span className="status-dot" /> PICK UP WHERE YOU LEFT OFF
            </span>
            <div className="feature-tags">
              <Tag tone="sage">{article?.category || 'Your reading room'}</Tag>
              <span>{article ? minutes(article.content) : 0} MIN READ</span>
            </div>
            <h2>{article?.title || 'Your next good read starts here.'}</h2>
            <p>
              {article
                ? article.content.slice(0, 132) + '…'
                : 'Import an essay, an article, or a passage from your current book.'}
            </p>
            <div className="feature-meta">
              {article?.author || 'A space for close reading'} <span>·</span>{' '}
              {article?.source || 'Your personal library'}
            </div>
            <div className="feature-bottom">
              <Button onClick={() => (article ? openArticle(article) : onImport())}>
                {article ? 'Continue reading' : 'Add your first article'}
                <ArrowUpRight size={16} />
              </Button>
              <div className="reading-progress">
                <span>{Math.round(article?.progress || 0)}% complete</span>
                <div className="progress-track">
                  <i style={{ width: (article?.progress || 0) + '%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="book-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">+</span>
            <div className="book-shape">
              <div className="book-spine" />
              <span className="book-imprint">THE MARGIN ESSAYS</span>
              <div className="book-cover-title">
                On the
                <br />
                <em>art of</em>
                <br />
                noticing.
              </div>
              <div className="book-cover-lines">
                ∿<br />∿<br />∿
              </div>
              <span className="book-author">A CLOSER LOOK AT THE EVERYDAY</span>
            </div>
            <span className="art-caption">GOOD THINGS TAKE ATTENTION.</span>
          </div>
        </section>
        <section className="review-feature">
          <div className="review-topline">
            <span className="overline">MAKE IT STICK</span>
            <Layers3 size={21} />
          </div>
          <div className="review-number">
            {due}
            <span>ready to revisit</span>
          </div>
          <p>
            A familiar word becomes your own
            <br />
            each time you bring it back.
          </p>
          <div className="review-stack" aria-hidden="true">
            <div />
            <div />
            <div>
              <span>A MOMENT OF RECALL</span>
              <strong>{data.entries[0]?.term || 'A new perspective'}</strong>
              <span>What does it mean to you?</span>
            </div>
          </div>
          <Button onClick={() => go('review')}>
            {due ? 'Start a review' : 'View your review queue'}
            <ArrowRight size={16} />
          </Button>
          <span className="review-footnote">A few thoughtful minutes. No rush.</span>
        </section>
      </div>
      <div className="metric-strip">
        {[
          {
            icon: BookOpen,
            value: data.articles.filter((a) => a.status === 'finished').length,
            label: 'Pieces read',
            note: data.articles.length + ' in your library',
          },
          {
            icon: Bookmark,
            value: data.entries.length,
            label: 'Words & expressions',
            note: 'Collected in context',
          },
          {
            icon: Braces,
            value: completed.size + '/' + data.lessons.length,
            label: 'Grammar topics explored',
            note: 'Understanding the structure',
          },
          {
            icon: Layers3,
            value: retention === null ? '—' : retention + '%',
            label: 'Recall success',
            note: data.reviews.length
              ? data.reviews.length + ' recorded reviews'
              : 'Your first review starts the story',
          },
        ].map((s) => (
          <div className="metric" key={s.label}>
            <div className="metric-label">
              <s.icon size={16} />
              {s.label}
            </div>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="collection-panel">
          <SectionTitle
            title="Words worth keeping"
            detail="A small collection. A richer vocabulary."
            action={
              <button className="text-link" onClick={() => go('collection')}>
                View collection <ArrowUpRight size={14} />
              </button>
            }
          />
          <div className="word-table">
            {recent.map((e) => (
              <button key={e.id} className="word-row" onClick={() => editEntry(e)}>
                <span className="word-initial">{e.kind === 'expression' ? '“' : e.term[0]}</span>
                <span>
                  <strong>
                    {e.term}
                    <em>{e.pos}</em>
                  </strong>
                  <small>{e.meaning}</small>
                </span>
                <Tag tone={e.status === 'familiar' ? 'sage' : 'cream'}>
                  {e.status === 'new' ? 'Just collected' : e.status}
                </Tag>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          {!recent.length && (
            <p className="muted">
              Select an interesting word while reading to start your collection.
            </p>
          )}
        </section>
        <section className="grammar-preview">
          <SectionTitle
            title="Find the structure"
            detail="A little clarity, one construction at a time."
          />
          <div className="lesson-preview-icon">
            <Braces size={25} />
            <span>GRAMMAR STUDIO</span>
          </div>
          <h3>{lesson?.title || 'Every topic explored'}</h3>
          <p>{lesson?.description || 'Return to a topic and deepen your understanding.'}</p>
          <div className="grammar-progress">
            <div className="progress-track">
              <i style={{ width: (completed.size / data.lessons.length) * 100 + '%' }} />
            </div>
            <span>
              {completed.size} of {data.lessons.length} topics completed
            </span>
          </div>
          <button className="text-link" onClick={() => go('grammar')}>
            Spend a moment with grammar <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="performance-panel">
          <span className="overline">UNDERSTANDING, IN PRACTICE</span>
          <h3>
            {accuracy === null
              ? 'Your comprehension story starts here.'
              : accuracy + '% accuracy in comprehension'}
          </h3>
          <p>
            {objective.length
              ? objective.length +
                ' objective responses recorded. Written reflections are kept separate.'
              : 'Read a passage, consider its argument, and show the evidence behind your answer.'}
          </p>
          <button className="text-link" onClick={() => go('comprehension')}>
            Open comprehension lab <MoveUpRight size={15} />
          </button>
        </section>
        <section className="reflection-note">
          <Quote size={22} />
          <p>
            “Keep the sentence that changed your mind.
            <br />
            Come back to it. See what changes next.”
          </p>
          <span>THE MARGIN APPROACH</span>
        </section>
      </div>
      <div className="dashboard-trail">
        <section>
          <SectionTitle
            title="Your reading trail"
            detail="The pieces you’ve made room for."
            action={
              <button className="text-link" onClick={() => go('reader')}>
                Reading history <ArrowUpRight size={14} />
              </button>
            }
          />
          {[...data.articles]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 3)
            .map((a) => (
              <button className="trail-row" key={a.id} onClick={() => openArticle(a)}>
                <BookOpen size={16} />
                <span>
                  <strong>{a.title}</strong>
                  <small>
                    Added {dateLabel(a.created_at)} · {a.category}
                  </small>
                </span>
                <Tag tone={a.status === 'finished' ? 'sage' : 'neutral'}>
                  {a.status === 'reading' ? Math.round(a.progress) + '% read' : a.status}
                </Tag>
              </button>
            ))}
          {!data.articles.length && (
            <p className="muted small">Your reading history begins with your first import.</p>
          )}
        </section>
        <section>
          <SectionTitle
            title="A chance to think again"
            detail="Recent notes from your learning."
            action={
              <button className="text-link" onClick={() => go('mistakes')}>
                Notebook <ArrowUpRight size={14} />
              </button>
            }
          />
          {[...data.mistakes]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 3)
            .map((m) => (
              <button className="trail-row" key={m.id} onClick={() => go('mistakes')}>
                <Braces size={16} />
                <span>
                  <strong>{m.prompt}</strong>
                  <small>
                    {m.topic} · {m.subjective ? 'Writing reflection' : 'Exercise feedback'}
                  </small>
                </span>
                <Tag tone={m.resolved ? 'sage' : 'cream'}>
                  {m.resolved ? 'Reflected on' : 'To revisit'}
                </Tag>
              </button>
            ))}
          {!data.mistakes.length && (
            <p className="notebook-empty">
              Your missed exercises and writing reflections will appear here. A useful place to
              notice patterns, at your own pace.
            </p>
          )}
        </section>
      </div>
      {data.mistakes.filter((m) => !m.resolved).length > 0 && (
        <button className="notice notebook-notice" onClick={() => go('mistakes')}>
          {data.mistakes.filter((m) => !m.resolved).length} moments to learn from in your mistake
          notebook <ArrowRight size={16} />
        </button>
      )}
    </>
  );
}
