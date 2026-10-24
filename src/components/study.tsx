'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Braces,
  Plus,
  ScanText,
  BookOpen,
  NotebookPen,
  Feather,
  RotateCcw,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import type { Question, Article, Entry } from '@/lib/types';
import { useWorkspace } from './context';
import { Button, Field, Tag, Empty, Modal, dateLabel } from './ui';
import { AIHelp } from './ai-help';
export function Grammar() {
  const { data, run, busy, editEntry, notify } = useWorkspace(),
    [active, setActive] = useState<string | null>(null);
  const lesson = data.lessons.find((l) => l.id === active),
    complete = new Set(data.lesson_progress.filter((l) => l.completed).map((l) => l.lesson_id));
  if (lesson) {
    const questions = data.questions.filter((q) => q.lesson_id === lesson.id),
      solved = questions.filter((q) =>
        data.attempts.some((a) => a.question_id === q.id && a.correct),
      ).length;
    return (
      <>
        <button className="text-link back-link" onClick={() => setActive(null)}>
          <ArrowLeft size={16} /> Grammar studio
        </button>
        <div className="lesson-header">
          <span className="eyebrow">
            {lesson.group_name} <span>/</span> TOPIC {lesson.position + 1}
          </span>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
        </div>
        <div className="study-two-col">
          <div>
            <section className="lesson-body panel">
              <span className="overline">THE IDEA, SIMPLY</span>
              <p>{lesson.body}</p>
              <h3>See it in a sentence</h3>
              {lesson.examples.map((e, i) => (
                <blockquote key={i}>{e}</blockquote>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  editEntry({
                    term: lesson.title,
                    kind: 'grammar',
                    meaning: lesson.body,
                    sentence: lesson.examples[0],
                    tags: lesson.group_name,
                  })
                }
              >
                <Plus size={15} /> Keep this rule for review
              </Button>
            </section>
            <div className="section-heading exercise-heading">
              <h2>Put the idea to work</h2>
              <span className="muted small">
                {solved}/{questions.length} understood
              </span>
            </div>
            {questions.map((q) => (
              <Exercise key={q.id} question={q} />
            ))}
            <div className="lesson-complete">
              <Button
                loading={busy}
                disabled={solved < questions.length || complete.has(lesson.id)}
                onClick={() =>
                  run('lesson.complete', { id: lesson.id })
                    .then(() => notify('Topic completed. Come back whenever you need it.'))
                    .catch(() => {})
                }
              >
                <CheckCircle2 size={16} />
                {complete.has(lesson.id) ? 'Topic completed' : 'Complete this topic'}
              </Button>
              {solved < questions.length && (
                <small>Work through both exercises to complete this topic.</small>
              )}
            </div>
          </div>
          <aside>
            <div className="panel study-aside">
              <Braces size={24} />
              <h3>Read it. Notice it. Use it.</h3>
              <p>
                Look for this construction in your next article. A rule becomes useful when you can
                see what it does.
              </p>
              <button
                className="text-link"
                onClick={() =>
                  editEntry({
                    term: lesson.title,
                    kind: 'grammar',
                    meaning: lesson.body,
                    sentence: lesson.examples[0],
                  })
                }
              >
                Add to spaced review <ArrowRight size={14} />
              </button>
            </div>
            <AIHelp
              task="grammar"
              text={'Explain ' + lesson.title + ' and give a contrasting example.'}
              context={lesson.body}
            />
          </aside>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">UNDERSTAND THE CHOICES BEHIND A SENTENCE</div>
          <h1>
            Grammar, with purpose<span className="accent-period">.</span>
          </h1>
          <p>A considered path from the familiar to the finely nuanced.</p>
        </div>
        <div className="curriculum-count">
          <strong>
            {complete.size}
            <span> / {data.lessons.length}</span>
          </strong>
          <span>topics explored</span>
        </div>
      </div>
      <div className="curriculum-intro">
        <Braces size={23} />
        <p>
          Follow your curiosity, or start at the beginning. Every topic includes an explanation,
          original examples and practice.
        </p>
        <Tag tone="sage">SELF-PACED</Tag>
      </div>
      {['Foundations', 'Sentence craft', 'Advanced usage'].map((group, i) => (
        <section className="curriculum-section" key={group}>
          <div className="section-heading">
            <h2>
              <span className="chapter-number">0{i + 1}</span>
              {group}
            </h2>
            <span className="muted small">
              {data.lessons.filter((l) => l.group_name === group).length} topics
            </span>
          </div>
          <div className="lesson-grid">
            {data.lessons
              .filter((l) => l.group_name === group)
              .sort((a, b) => a.position - b.position)
              .map((l) => {
                const attempted = data.questions.some(
                  (q) => q.lesson_id === l.id && data.attempts.some((a) => a.question_id === q.id),
                );
                return (
                  <button
                    className={'lesson-card ' + (complete.has(l.id) ? 'completed' : '')}
                    key={l.id}
                    onClick={() => setActive(l.id)}
                  >
                    <span className="lesson-card-index">
                      {String(l.position + 1).padStart(2, '0')}
                      {complete.has(l.id) && <CheckCircle2 size={18} />}
                    </span>
                    <h3>{l.title}</h3>
                    <p>{l.description}</p>
                    <div>
                      <span>
                        {complete.has(l.id)
                          ? 'Explored'
                          : attempted
                            ? 'Continue exploring'
                            : 'Explanation + 2 exercises'}
                      </span>
                      <ArrowUpRight size={16} />
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
export function Exercise({ question, article }: { question: Question; article?: Article }) {
  const { data, run, busy } = useWorkspace(),
    [response, setResponse] = useState(''),
    [evidence, setEvidence] = useState(''),
    [result, setResult] = useState<{
      correct: boolean | null;
      answer: string;
      explanation: string;
    } | null>(null),
    [compare, setCompare] = useState(false);
  const previous = [...data.attempts].reverse().find((a) => a.question_id === question.id);
  async function submit(self_assessment?: string) {
    try {
      setResult(
        await run('attempt.submit', {
          question_id: question.id,
          response,
          evidence,
          self_assessment,
        }),
      );
    } catch {}
  }
  return (
    <section className="exercise panel">
      <div className="exercise-meta">
        <Tag tone="lavender">{question.lesson_id ? 'Practice' : question.type}</Tag>
        {question.ai_generated && <Tag>AI suggested · verify</Tag>}
        {previous && (
          <span className="muted small">
            Previously{' '}
            {previous.correct === null
              ? 'reflected on'
              : previous.correct
                ? 'answered correctly'
                : 'revisited'}
          </span>
        )}
      </div>
      <h3>{question.prompt}</h3>
      {question.options.length ? (
        <fieldset className="answer-options" disabled={!!result}>
          <legend className="sr-only">Choose your answer</legend>
          {question.options.map((option, i) => (
            <label key={i} className={'answer-option ' + (response === option ? 'chosen' : '')}>
              <input
                type="radio"
                name={question.id}
                checked={response === option}
                onChange={() => setResponse(option)}
              />
              <span className="option-letter">{String.fromCharCode(65 + i)}</span>
              {option}
            </label>
          ))}
        </fieldset>
      ) : (
        <Field label="Your response">
          <textarea
            rows={4}
            value={response}
            disabled={!!result}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Find your own words…"
          />
        </Field>
      )}
      {article && (
        <>
          <Field
            label="Support your answer with evidence"
            hint="Copy an exact phrase or sentence from the source. Your evidence is kept with your answer."
          >
            <textarea
              rows={2}
              value={evidence}
              disabled={!!result}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="A passage that supports my reading…"
            />
          </Field>
          <details className="source-details">
            <summary>
              <BookOpen size={14} /> Read the source passage
            </summary>
            <p>{article.content}</p>
          </details>
        </>
      )}
      {result ? (
        <>
          <div
            className={'answer-feedback ' + (result.correct === false ? 'needs-work' : '')}
            role="status"
          >
            <strong>
              {result.correct === null
                ? 'Reflection recorded'
                : result.correct
                  ? 'Well understood.'
                  : 'A useful moment to pause.'}
            </strong>
            <p>{result.answer}</p>
            <small>{result.explanation}</small>
            {result.correct === false && (
              <p className="small">Saved to your mistake notebook so you can return to it.</p>
            )}
          </div>
          <button
            className="text-link"
            onClick={() => {
              setResult(null);
              setResponse('');
              setCompare(false);
            }}
          >
            Try a fresh response <RotateCcw size={14} />
          </button>
        </>
      ) : question.subjective ? (
        <>
          <Button
            variant="secondary"
            disabled={!response.trim() || (!!article && !evidence.trim())}
            onClick={() => setCompare(true)}
          >
            Compare with the guidance
          </Button>
          {compare && (
            <div className="self-assessment">
              <h4>A guide for reflection</h4>
              <p>{question.answer}</p>
              <p className="muted small">{question.explanation}</p>
              <span className="overline">YOUR JUDGEMENT · NOT AN AUTOMATIC GRADE</span>
              <div>
                <Button loading={busy} onClick={() => submit('sound')}>
                  My response is sound
                </Button>
                <Button variant="secondary" loading={busy} onClick={() => submit('revisit')}>
                  I’d like to improve it
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Button
          loading={busy}
          disabled={!response || (!!article && !evidence.trim())}
          onClick={() => submit()}
        >
          Consider my answer <ArrowRight size={15} />
        </Button>
      )}
    </section>
  );
}
export function SentenceLab() {
  const { data, run, notify } = useWorkspace(),
    [sentence, setSentence] = useState(''),
    [name, setName] = useState(''),
    [source, setSource] = useState(''),
    [notes, setNotes] = useState({
      clauses: '',
      relationships: '',
      constructions: '',
      purpose: '',
      alternatives: '',
      tone: '',
    });
  useEffect(() => {
    setSentence(sessionStorage.getItem('margin-sentence') || '');
    setSource(sessionStorage.getItem('margin-sentence-source') || '');
  }, []);
  const labels = {
    clauses: 'Clause structure',
    relationships: 'Grammatical relationships',
    constructions: 'Tense & constructions',
    purpose: 'Why this structure?',
    alternatives: 'Alternative ways to say it',
    tone: 'Tone & emphasis',
  };
  async function save() {
    try {
      await run('entry.save', {
        term: name,
        kind: 'construction',
        meaning: Object.entries(notes)
          .filter(([, v]) => v)
          .map(([k, v]) => labels[k as keyof typeof labels] + ': ' + v)
          .join('\n\n'),
        sentence,
        article_id: source || null,
        tags: 'sentence lab',
      });
      notify('Construction saved with identification and rewriting practice.');
    } catch {}
  }
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">SLOW DOWN AT THE SENTENCE</div>
          <h1>
            The sentence laboratory<span className="accent-period">.</span>
          </h1>
          <p>Take it apart. See what holds it together. Put it another way.</p>
        </div>
        <ScanText size={35} strokeWidth={1} />
      </div>
      <div className="study-two-col">
        <div className="panel sentence-workspace">
          <Field label="A sentence to explore">
            <textarea
              className="sentence-input"
              rows={4}
              value={sentence}
              placeholder="Select a sentence in the reader, or bring one here…"
              onChange={(e) => setSentence(e.target.value)}
            />
          </Field>
          <Field label="Source (optional)">
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">A sentence of my own</option>
              {data.articles.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="section-heading">
            <h2>Your working analysis</h2>
            <Tag tone="sage">MANUAL EXPLORATION</Tag>
          </div>
          <p className="muted small">
            There may be more than one useful reading. Record your reasoning, then test it against
            the sentence.
          </p>
          {Object.entries(labels).map(([key, label], i) => (
            <Field key={key} label={String(i + 1).padStart(2, '0') + ' / ' + label}>
              <textarea
                rows={2}
                value={notes[key as keyof typeof notes]}
                placeholder={
                  [
                    'Mark the main clause and any subordinate clauses.',
                    'Identify subjects, verbs, objects and what modifies what.',
                    'Name the tense, aspect or interesting construction.',
                    'What does the author gain from this arrangement?',
                    'Rewrite the idea using a different structure.',
                    'What becomes more prominent? What sounds more formal?',
                  ][i]
                }
                onChange={(e) => setNotes({ ...notes, [key]: e.target.value })}
              />
            </Field>
          ))}
          <Field label="A name for this construction">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fronted negative with inversion"
            />
          </Field>
          <Button
            disabled={
              !name.trim() || !sentence.trim() || !Object.values(notes).some((v) => v.trim())
            }
            onClick={save}
          >
            <Plus size={15} /> Save construction & follow-up practice
          </Button>
        </div>
        <aside>
          <div className="panel study-aside">
            <span className="small-star">✳</span>
            <h3>Start with what you can see.</h3>
            <p>
              Find the finite verbs. Identify the main proposition. Then ask what each additional
              phrase contributes.
            </p>
            <p>
              To practise afterwards, save a named construction. Its review cards ask you to
              identify it and rewrite a sentence with it.
            </p>
          </div>
          <AIHelp
            task="analysis"
            text={sentence}
            context={data.articles.find((a) => a.id === source)?.content || ''}
            onResult={(r) =>
              setNotes({
                clauses: Array.isArray(r.clauses) ? r.clauses.join('\n') : '',
                relationships: String(r.relationships || ''),
                constructions: Array.isArray(r.constructions) ? r.constructions.join('\n') : '',
                purpose: String(r.purpose || ''),
                alternatives: Array.isArray(r.alternatives) ? r.alternatives.join('\n') : '',
                tone: String(r.tone || ''),
              })
            }
          />
        </aside>
      </div>
    </>
  );
}
export function Comprehension() {
  const { data, run, notify } = useWorkspace(),
    [selected, setSelected] = useState(data.articles[0]?.id || ''),
    [creating, setCreating] = useState(false),
    [type, setType] = useState('all'),
    [aiQuestions, setAiQuestions] = useState<Partial<Question>[]>([]);
  useEffect(() => {
    const id = sessionStorage.getItem('margin-practice-article');
    if (id && data.articles.some((a) => a.id === id)) setSelected(id);
  }, []);
  const article = data.articles.find((a) => a.id === selected),
    questions = data.questions.filter(
      (q) => q.article_id === selected && (type === 'all' || q.type === type),
    );
  const close = useCallback(() => setCreating(false), []);
  const attempts = data.attempts.filter(
    (a) => data.questions.some((q) => q.id === a.question_id && q.article_id) && a.correct !== null,
  );
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">READ BEYOND THE WORDS</div>
          <h1>
            Stay with the idea<span className="accent-period">.</span>
          </h1>
          <p>Find the argument. Question the assumptions. Bring the evidence.</p>
        </div>
        <Button disabled={!article} onClick={() => setCreating(true)}>
          <Plus size={15} /> Create a question
        </Button>
      </div>
      <div className="comprehension-metrics">
        {[
          'factual',
          'main idea',
          'inference',
          'tone & purpose',
          'assumption',
          'critical reasoning',
        ].map((t) => {
          const a = attempts.filter(
            (a) => data.questions.find((q) => q.id === a.question_id)?.type === t,
          );
          return (
            <div key={t}>
              <span>{t}</span>
              <strong>
                {a.length
                  ? Math.round((a.filter((v) => v.correct).length / a.length) * 100) + '%'
                  : '—'}
              </strong>
              <small>{a.length} responses</small>
            </div>
          );
        })}
      </div>
      <div className="study-two-col">
        <div>
          <div className="panel comprehension-source">
            <Field label="Explore a piece from your reading room">
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setAiQuestions([]);
                }}
              >
                {data.articles.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Question type">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">All ways of understanding</option>
                {[
                  'factual',
                  'main idea',
                  'inference',
                  'tone & purpose',
                  'assumption',
                  'critical reasoning',
                  'summary',
                ].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
          {questions.map((q) => (
            <Exercise key={q.id} question={q} article={article} />
          ))}
          {!questions.length && (
            <Empty
              icon={<NotebookPen size={28} />}
              title="A question is a good beginning"
              detail="Create your own passage-linked question. The original attention essay includes a complete starter set."
            >
              <Button disabled={!article} onClick={() => setCreating(true)}>
                Create a question
              </Button>
            </Empty>
          )}
          {aiQuestions.map((q, i) => (
            <section className="panel ai-question-preview" key={i}>
              <Tag tone="lavender">AI DRAFT · REVIEW BEFORE SAVING</Tag>
              <h3>{q.prompt}</h3>
              <p>Answer: {q.answer}</p>
              <p>{q.explanation}</p>
              <blockquote>{q.evidence}</blockquote>
              <Button
                variant="secondary"
                onClick={() =>
                  run('question.create', { ...q, article_id: selected, ai_generated: true })
                    .then(() => {
                      setAiQuestions((prev) => prev.filter((v) => v !== q));
                      notify('Question saved. Verify its answer and evidence while practising.');
                    })
                    .catch(() => {})
                }
              >
                Save this question
              </Button>
            </section>
          ))}
        </div>
        <aside>
          <div className="panel study-aside">
            <BookOpen size={24} />
            <h3>Understanding needs evidence.</h3>
            <p>
              Quote the passage that supports your answer. For a summary or written reflection,
              compare with the guidance and assess your own work.
            </p>
            <p>Objective accuracy and subjective writing improvements are recorded separately.</p>
          </div>
          {article && (
            <AIHelp
              task="comprehension"
              text="Create up to 7 thoughtful questions covering comprehension, inference, tone and reasoning. Include at least one written reflection."
              context={article.content}
              onResult={(r) => setAiQuestions(r.questions as Partial<Question>[])}
            />
          )}
        </aside>
      </div>
      {creating && article && <QuestionDialog article={article} onClose={close} />}
    </>
  );
}
function QuestionDialog({ article, onClose }: { article: Article; onClose: () => void }) {
  const { run, busy, notify } = useWorkspace(),
    [draft, setDraft] = useState({
      type: 'inference',
      prompt: '',
      options: '',
      answer: '',
      explanation: '',
      evidence: '',
      subjective: false,
    });
  return (
    <Modal title="A question worth asking" onClose={onClose} wide>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          run('question.create', {
            ...draft,
            article_id: article.id,
            options: draft.subjective
              ? []
              : draft.options
                  .split('\n')
                  .map((v) => v.trim())
                  .filter(Boolean),
          })
            .then(() => {
              notify('Question saved with its source evidence.');
              onClose();
            })
            .catch(() => {});
        }}
      >
        <Field label="Kind of understanding">
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            {[
              'factual',
              'main idea',
              'inference',
              'tone & purpose',
              'assumption',
              'critical reasoning',
              'summary',
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Question">
          <textarea
            required
            rows={2}
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
          />
        </Field>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={draft.subjective}
            onChange={(e) => setDraft({ ...draft, subjective: e.target.checked })}
          />{' '}
          Written response with self-assessment
        </label>
        {!draft.subjective && (
          <Field label="Answer options (one per line)">
            <textarea
              required
              rows={4}
              value={draft.options}
              onChange={(e) => setDraft({ ...draft, options: e.target.value })}
            />
          </Field>
        )}
        <Field
          label={
            draft.subjective
              ? 'Guidance for a strong response'
              : 'Correct answer (exactly one of the options)'
          }
        >
          <textarea
            required
            rows={2}
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          />
        </Field>
        <Field label="Explanation">
          <textarea
            required
            rows={2}
            value={draft.explanation}
            onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
          />
        </Field>
        <Field label="Supporting source passage (exact quotation)">
          <textarea
            required
            rows={3}
            value={draft.evidence}
            onChange={(e) => setDraft({ ...draft, evidence: e.target.value })}
          />
        </Field>
        <details className="source-details">
          <summary>Read the source</summary>
          <p>{article.content}</p>
        </details>
        <div className="dialog-footer">
          <Button type="submit" loading={busy}>
            Save question <Plus size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Mistakes() {
  const { data, run, notify } = useWorkspace(),
    [filter, setFilter] = useState('open'),
    [topic, setTopic] = useState('all'),
    [adding, setAdding] = useState(false),
    [draft, setDraft] = useState({
      topic: 'Writing',
      prompt: '',
      response: '',
      feedback: '',
      subjective: true,
    });
  const filtered = data.mistakes.filter(
    (m) =>
      (filter === 'all' ||
        (filter === 'open' && !m.resolved) ||
        (filter === 'resolved' && m.resolved)) &&
      (topic === 'all' || m.topic === topic),
  );
  const topics = [...new Set(data.mistakes.map((m) => m.topic))];
  const close = useCallback(() => setAdding(false), []);
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">NOTICE THE PATTERN. CHANGE THE HABIT.</div>
          <h1>
            A notebook for becoming<span className="accent-period">.</span>
          </h1>
          <p>A mistake is useful when you give yourself a way back to it.</p>
        </div>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={15} /> Add a reflection
        </Button>
      </div>
      {topics.length > 0 && (
        <div className="weaknesses">
          {topics.map((t) => (
            <button className="weakness" key={t} onClick={() => setTopic(topic === t ? 'all' : t)}>
              <span>{t}</span>
              <strong>{data.mistakes.filter((m) => m.topic === t && !m.resolved).length}</strong>
              <small>to revisit</small>
            </button>
          ))}
        </div>
      )}
      <div className="collection-toolbar">
        <div className="tabs">
          {['open', 'resolved', 'all'].map((t) => (
            <button className={filter === t ? 'active' : ''} key={t} onClick={() => setFilter(t)}>
              {t === 'open' ? 'To revisit' : t === 'resolved' ? 'Reflected on' : 'Everything'}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="all">Every topic</option>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="mistake-list">
        {filtered.map((m) => (
          <section className="panel mistake-card" key={m.id}>
            <div className="exercise-meta">
              <Tag tone="lavender">{m.topic}</Tag>
              <Tag tone={m.subjective ? 'cream' : 'sage'}>
                {m.subjective ? 'Writing improvement · subjective' : 'Incorrect response'}
              </Tag>
              <span className="muted small">{dateLabel(m.created_at)}</span>
            </div>
            <h3>{m.prompt}</h3>
            <div className="mistake-comparison">
              <div>
                <span className="overline">MY RESPONSE</span>
                <p>{m.response || 'Not recalled'}</p>
              </div>
              <div>
                <span className="overline">A WAY FORWARD</span>
                <p>{m.feedback}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                run('mistake.resolve', { id: m.id, resolved: !m.resolved }).catch(() => {})
              }
            >
              {m.resolved ? <RotateCcw size={14} /> : <Check size={14} />}{' '}
              {m.resolved ? 'Revisit again' : 'I’ve reflected on this'}
            </Button>
          </section>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          icon={<Feather size={30} />}
          title="Space to learn, without judgement"
          detail="Missed exercises and difficult reviews appear here. You can also keep a personal writing reflection."
        />
      )}
      {adding && (
        <Modal title="Keep a useful reflection" onClose={close}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              run('mistake.create', draft)
                .then(() => {
                  close();
                  notify('Reflection saved to your notebook.');
                })
                .catch(() => {});
            }}
          >
            {(['topic', 'prompt', 'response', 'feedback'] as const).map((k) => (
              <Field
                key={k}
                label={
                  {
                    topic: 'Topic',
                    prompt: 'Original question or writing task',
                    response: 'What I wrote',
                    feedback: 'Correction or feedback',
                  }[k]
                }
              >
                {k === 'topic' ? (
                  <input
                    required
                    value={draft[k]}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  />
                ) : (
                  <textarea
                    required
                    rows={3}
                    value={draft[k]}
                    onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  />
                )}
              </Field>
            ))}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.subjective}
                onChange={(e) => setDraft({ ...draft, subjective: e.target.checked })}
              />{' '}
              This is a subjective writing improvement
            </label>
            <Button type="submit">Save reflection</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
