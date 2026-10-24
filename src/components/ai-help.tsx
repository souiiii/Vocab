'use client';
import { useState, useEffect } from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { request, useWorkspace } from './context';
import { Button, Field } from './ui';
export function AIHelp({
  task,
  text,
  context = '',
  onResult,
}: {
  task: string;
  text: string;
  context?: string;
  onResult?: (value: Record<string, unknown>) => void;
}) {
  const { go, notify } = useWorkspace();
  const [state, setState] = useState<'loading' | 'offline' | 'ready'>('loading'),
    [model, setModel] = useState(''),
    [models, setModels] = useState<{ id: string; name: string }[]>([]),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    request<{ plan_enabled: boolean }>('/api/ai')
      .then(async (s) => {
        if (!s.plan_enabled) {
          if (!cancelled) setState('offline');
          return;
        }
        const options = await request<{ id: string; name: string }[]>('/api/ai?models');
        if (!cancelled) {
          setModels(options);
          setModel(options[0]?.id || '');
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('offline');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function generate() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await request<{ result: Record<string, unknown> }>('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, text, context, model }),
      });
      setResult(r.result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ai-help">
      <div className="ai-help-title">
        <Sparkles size={16} />
        <strong>A second perspective</strong>
        <span>OPTIONAL AI</span>
      </div>
      {state === 'loading' ? (
        <p className="muted small">Checking your AI connection…</p>
      ) : state === 'offline' ? (
        <>
          <p>
            Connect ChatGPT in Settings for contextual guidance. You can keep studying and writing
            your own analysis here.
          </p>
          <button type="button" className="text-link" onClick={() => go('settings')}>
            Manage connection <ArrowUpRight size={14} />
          </button>
        </>
      ) : (
        <>
          <p>Uses your ChatGPT plan. Suggestions can be mistaken; compare them with the passage.</p>
          <div className="ai-controls">
            <select
              aria-label="ChatGPT model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              loading={busy}
              disabled={!text.trim() || !model}
              onClick={generate}
            >
              <Sparkles size={14} /> Get a perspective
            </Button>
          </div>
        </>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="ai-result">
          <span className="overline">AI SUGGESTION · CHATGPT PLAN</span>
          <Structured value={result} />
          {onResult && (
            <Button
              variant="secondary"
              onClick={() => {
                onResult(result);
                notify('Suggestion added to your draft. Review it before saving.');
              }}
            >
              Use in my draft
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
function Structured({ value }: { value: unknown }) {
  if (typeof value === 'string') return <p>{value}</p>;
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((v, i) => (
          <li key={i}>
            <Structured value={v} />
          </li>
        ))}
      </ul>
    );
  if (value && typeof value === 'object')
    return (
      <>
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <strong className="ai-key">{k.replaceAll('_', ' ')}</strong>
            <Structured value={v} />
          </div>
        ))}
      </>
    );
  return null;
}
