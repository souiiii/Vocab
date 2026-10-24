'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  LogOut,
  ArrowUpRight,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { useWorkspace, request } from './context';
import { Button, Field, Tag, Modal, dateLabel } from './ui';
import { AIHelp } from './ai-help';
type AIStatus = {
  connected: boolean;
  verified_live: boolean;
  plan_enabled: boolean;
  active: string | null;
  accounts: { id: string; label: string; email: string; connected: boolean }[];
  usage: { at: string; task: string; model: string; billing: string }[];
};
export function SettingsPage() {
  const { data, run, busy, notify, refresh } = useWorkspace(),
    [name, setName] = useState(data.settings.name),
    [ai, setAi] = useState<AIStatus | null>(null),
    [consent, setConsent] = useState(false),
    [connecting, setConnecting] = useState(false),
    [exporting, setExporting] = useState(false),
    [backup, setBackup] = useState<{ name: string; text: string } | null>(null),
    [confirmText, setConfirmText] = useState(''),
    [restoring, setRestoring] = useState(false),
    [task, setTask] = useState('comparison'),
    [ask, setAsk] = useState(''),
    [context, setContext] = useState('');
  const loadAI = useCallback(
    () =>
      request<AIStatus>('/api/ai')
        .then(setAi)
        .catch((e) => notify((e as Error).message, true)),
    [notify],
  );
  useEffect(() => {
    loadAI();
  }, [loadAI]);
  const closeRestore = useCallback(() => {
    setBackup(null);
    setConfirmText('');
  }, []);
  async function connect(account?: string) {
    setConnecting(true);
    try {
      const result = await request<{ url: string }>('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', consent, account }),
      });
      location.assign(result.url);
    } catch (e) {
      notify((e as Error).message, true);
      setConnecting(false);
    }
  }
  async function download() {
    setExporting(true);
    try {
      const r = await fetch('/api/backup');
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error);
      }
      const blob = await r.blob(),
        url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = 'margin-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Backup exported. Keep a second copy away from this computer.');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setExporting(false);
    }
  }
  async function restore() {
    if (!backup || confirmText !== 'REPLACE') return;
    setRestoring(true);
    try {
      await request('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Margin-Restore': 'REPLACE' },
        body: backup.text,
      });
      await refresh();
      closeRestore();
      notify('Your learning data was restored successfully.');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setRestoring(false);
    }
  }
  return (
    <>
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">MAKE THIS SPACE YOUR OWN</div>
          <h1>
            A few thoughtful settings<span className="accent-period">.</span>
          </h1>
          <p>Your workspace, your preferences, your data.</p>
        </div>
      </div>
      <div className="settings-layout">
        <div>
          <section className="panel settings-panel">
            <div className="settings-title">
              <Sun size={20} />
              <div>
                <h2>At home in your workspace</h2>
                <p>A comfortable space makes it easier to return.</p>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run('settings.save', { ...data.settings, name })
                  .then(() => notify('Preferences saved.'))
                  .catch(() => {});
              }}
            >
              <Field label="What should we call you?">
                <input value={name} required onChange={(e) => setName(e.target.value)} />
              </Field>
              <Button type="submit" variant="secondary" loading={busy}>
                Save preferences
              </Button>
            </form>
            <Field label="Workspace theme">
              <div className="theme-choices">
                {['light', 'sepia', 'dark'].map((t) => (
                  <button
                    key={t}
                    aria-pressed={data.settings.theme === t}
                    className={'theme-choice theme-' + t}
                    onClick={() =>
                      run('settings.save', { ...data.settings, theme: t }).catch(() => {})
                    }
                  >
                    <span className="theme-preview">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      {t}
                      {data.settings.theme === t && <Check size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
          </section>
          <section className="panel settings-panel">
            <div className="settings-title">
              <Sparkles size={20} />
              <div>
                <h2>A second perspective, when you want it</h2>
                <p>Optional guidance through your ChatGPT plan.</p>
              </div>
            </div>
            <div className="connection-status">
              <span className={'status-dot ' + (ai?.plan_enabled ? '' : 'offline')} />
              <strong>
                {ai?.plan_enabled
                  ? 'ChatGPT plan connected'
                  : ai?.connected
                    ? 'Signed in · plan usage not enabled'
                    : 'AI is not connected'}
              </strong>
              <Tag tone="sage">CORE TOOLS ALWAYS AVAILABLE</Tag>
            </div>
            <p className="muted">
              Eligible ChatGPT Plus and Pro accounts can authorize supported requests through
              OpenAI’s official local-app flow. Availability depends on your account, workspace and
              current OpenAI policy.
            </p>
            <p className="muted">
              Only the text needed for a requested task is sent. Tokens stay in a protected backend
              file on this Mac. Every AI request uses the ChatGPT plan; no API-key billing path is
              configured.
            </p>
            <label className="checkbox-label consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I authorize Margin to connect my ChatGPT account and request permission to use my
                ChatGPT plan for learning tasks I initiate.
              </span>
            </label>
            <div className="connection-buttons">
              <Button loading={connecting} disabled={!consent} onClick={() => connect()}>
                Continue with ChatGPT <ArrowUpRight size={15} />
              </Button>
              <a
                className="text-link"
                href="https://developers.openai.com/siwc/token-sharing-open-source"
                target="_blank"
                rel="noreferrer"
              >
                Official integration guide <ExternalLink size={13} />
              </a>
            </div>
            {ai?.accounts.map((a) => (
              <div className="account-row" key={a.id}>
                <div>
                  <strong>{a.label}</strong>
                  <small>
                    {a.id === ai.active
                      ? 'Selected account'
                      : a.connected
                        ? 'Saved account'
                        : 'Disconnected registration'}
                  </small>
                </div>
                <Button variant="ghost" disabled={!consent} onClick={() => connect(a.id)}>
                  Reauthorize
                </Button>
                {a.id !== ai.active && a.connected && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      request('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'select', account: a.id }),
                      })
                        .then(loadAI)
                        .catch((e) => notify(e.message, true))
                    }
                  >
                    Select
                  </Button>
                )}
              </div>
            ))}
            {ai?.connected && (
              <Button
                variant="secondary"
                onClick={() =>
                  request<{ message: string }>('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'disconnect' }),
                  })
                    .then((r) => {
                      notify(r.message);
                      loadAI();
                    })
                    .catch((e) => notify(e.message, true))
                }
              >
                <LogOut size={14} /> Disconnect selected account
              </Button>
            )}
            <div className="notice small">
              {ai?.verified_live
                ? 'A completed request has verified plan inference for this account. Requests remain subject to OpenAI usage limits.'
                : 'Sign in and complete a request to verify supported access for your account. If access is declined or limited, manual learning remains available.'}
            </div>
            {ai?.usage.length ? (
              <details className="source-details">
                <summary>ChatGPT-plan request history · {ai.usage.length} recent</summary>
                {ai.usage.map((u, i) => (
                  <div className="history-row" key={i}>
                    {dateLabel(u.at)} · {u.task} · {u.model} <Tag>{u.billing}</Tag>
                  </div>
                ))}
              </details>
            ) : null}
          </section>
          <section className="panel settings-panel">
            <div className="settings-title">
              <Database size={20} />
              <div>
                <h2>Keep what you’ve learned</h2>
                <p>Months of learning deserve more than one copy.</p>
              </div>
            </div>
            <div className="database-status">
              <ShieldCheck size={22} />
              <div>
                <strong>
                  {data.database === 'local'
                    ? 'Local PostgreSQL (PGlite)'
                    : 'PostgreSQL connection configured'}
                </strong>
                <p>
                  {data.database === 'local'
                    ? 'Learning data persists in .local/postgres on this computer.'
                    : 'Learning data is stored in the PostgreSQL database configured on your backend.'}
                </p>
              </div>
            </div>
            <p className="muted">
              To connect Neon, set <code>DATABASE_URL</code> in <code>.env.local</code> and restart
              the app. Export first, then restore into the new database to carry your history
              across. No data is moved automatically.
            </p>
            <div className="backup-actions">
              <Button loading={exporting} onClick={download}>
                <Download size={15} /> Export all learning data
              </Button>
              <label className="button secondary upload-button">
                <Upload size={15} /> Restore a JSON backup
                <input
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 30_000_000) {
                      notify('Backup exceeds 30 MB.', true);
                      return;
                    }
                    try {
                      const text = await f.text();
                      JSON.parse(text);
                      setBackup({ name: f.name, text });
                    } catch {
                      notify('This file is not valid JSON.', true);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <p className="small muted">
              Exports contain articles, highlights, vocabulary, lessons, questions, attempts,
              reviews, mistakes and preferences. OAuth credentials are excluded.
            </p>
            <details className="source-details">
              <summary>PostgreSQL backup & recovery</summary>
              <p>
                Use the commands in README.md for an encrypted/off-device pg_dump backup and an
                isolated pg_restore. A Neon database is persistent storage; keep independent backups
                too. The portable JSON export also works between local PostgreSQL and Neon.
              </p>
            </details>
          </section>
          <section className="panel settings-panel">
            <div className="settings-title">
              <NotebookSymbol />
              <div>
                <h2>The language workbench</h2>
                <p>Ask for a comparison, feedback or personalised practice.</p>
              </div>
            </div>
            <div className="form-stack">
              <Field label="What would help?">
                <select value={task} onChange={(e) => setTask(e.target.value)}>
                  <option value="comparison">Compare words in context</option>
                  <option value="evaluation">Reflect on my writing</option>
                  <option value="practice">Create personalised practice</option>
                  <option value="grammar">Explain a grammar choice</option>
                </select>
              </Field>
              <Field label="Your request">
                <textarea
                  rows={3}
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  placeholder="e.g. Compare reticent and reluctant, with examples from technical discussions."
                />
              </Field>
              <Field label="Context (optional)">
                <textarea rows={3} value={context} onChange={(e) => setContext(e.target.value)} />
              </Field>
              <AIHelp task={task} text={ask} context={context} />
            </div>
          </section>
        </div>
        <aside className="settings-aside">
          <span className="small-star">✳</span>
          <h3>
            A practice.
            <br />
            Not a performance.
          </h3>
          <p>
            Read something that interests you. Notice a choice of words. Try it yourself. Come back
            to it.
          </p>
          <div className="philosophy-steps">
            {['Exposure', 'Understanding', 'Collection', 'Practice', 'Retention'].map((s, i) => (
              <div key={s}>
                <span>0{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
          <span className="overline">THE MARGIN APPROACH</span>
        </aside>
      </div>
      {backup && (
        <Modal title="Restore your learning data" onClose={closeRestore}>
          <div className="notice error">
            Restoring replaces the current learning data with <strong>{backup.name}</strong>. Export
            your current workspace first. The restore runs as one transaction; an invalid backup
            leaves existing data intact.
          </div>
          <Field label="Type REPLACE to confirm">
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </Field>
          <div className="dialog-footer">
            <Button variant="ghost" onClick={closeRestore}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmText !== 'REPLACE'}
              loading={restoring}
              onClick={restore}
            >
              Replace and restore
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function NotebookSymbol() {
  return <span style={{ fontSize: 22 }}>Aa</span>;
}
