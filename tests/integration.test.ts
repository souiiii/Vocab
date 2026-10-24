import { beforeAll, describe, it, expect } from 'vitest';
import { snapshot, command } from '../src/lib/service';
import { exportData, restoreData } from '../src/lib/backup';
import { db } from '../src/lib/db';
import { assertLocal, localOrigin } from '../src/lib/security';
import { isPublicAddress, robotsAllowed } from '../src/lib/importer';
import { segments } from '../src/lib/anchors';
import { aiStatus, consumeStream } from '../src/lib/ai';
import type { Article, Entry, Card } from '../src/lib/types';
import { GET } from '../src/app/api/workspace/route';
let article: Article, entry: Entry;
beforeAll(async () => {
  process.env.LOCAL_DATA_DIR = 'memory://';
  process.env.AI_DATA_DIR = '/tmp/margin-ai-test-' + process.pid;
  delete process.env.DATABASE_URL;
  await snapshot();
});
describe('actual PostgreSQL learning lifecycle', () => {
  it('seeds real lessons and original exercises without fake learning history', async () => {
    const s = await snapshot();
    expect(s.lessons).toHaveLength(12);
    expect(s.questions).toHaveLength(31);
    expect(s.reviews).toHaveLength(0);
    expect(s.attempts).toHaveLength(0);
  });
  it('imports text and reloads stable annotations', async () => {
    article = (await command('article.create', {
      title: 'My imported essay',
      content:
        'A quiet beginning. A measured response can change a discussion.\n\nRead it carefully.',
    })) as Article;
    const quote = 'A measured response';
    const start = article.content.indexOf(quote);
    const a = (await command('annotation.create', {
      article_id: article.id,
      start,
      end: start + quote.length,
      quote,
      note: 'Restraint and deliberation.',
    })) as { id: string };
    const s = await snapshot();
    expect(s.annotations.find((n) => n.id === a.id)?.quote).toBe(quote);
    expect(
      segments(
        article.content,
        s.annotations.filter((a) => a.article_id === article.id),
      )
        .map((s) => s.text)
        .join(''),
    ).toBe(article.content);
  });
  it('rejects an anchor with text that does not match', async () => {
    await expect(
      command('annotation.create', { article_id: article.id, start: 0, end: 4, quote: 'fake' }),
    ).rejects.toThrow('anchor');
  });
  it('saves vocabulary and protects normalised duplicates', async () => {
    entry = (await command('entry.save', {
      term: 'Circumspect',
      meaning: 'Careful before acting.',
      sentence: 'A circumspect response helped.',
      article_id: article.id,
    })) as Entry;
    await expect(
      command('entry.save', { term: '  CIRCUMSPECT  ', meaning: 'Careful.' }),
    ).rejects.toThrow('already exists');
    expect((await snapshot()).cards.filter((c) => c.entry_id === entry.id)).toHaveLength(4);
  });
  it('records a missed grammar exercise and an objective mistake', async () => {
    const r = (await command('attempt.submit', {
      question_id: 'q-inversion-0',
      response: 'I have received',
    })) as { correct: boolean };
    expect(r.correct).toBe(false);
    expect(
      (await snapshot()).mistakes.some((m) => m.topic === 'Inversion & emphasis' && !m.subjective),
    ).toBe(true);
  });
  it('requires exercise success before completing a lesson', async () => {
    await expect(command('lesson.complete', { id: 'inversion' })).rejects.toThrow('each exercise');
    for (const q of (await snapshot()).questions.filter((q) => q.lesson_id === 'inversion'))
      await command('attempt.submit', { question_id: q.id, response: q.answer });
    await command('lesson.complete', { id: 'inversion' });
    expect(
      (await snapshot()).lesson_progress.some((p) => p.lesson_id === 'inversion' && p.completed),
    ).toBe(true);
  });
  it('creates an evidence-linked question and validates source grounding', async () => {
    const q = (await command('question.create', {
      article_id: article.id,
      type: 'inference',
      prompt: 'What might change the discussion?',
      options: ['A measured response', 'Noise'],
      answer: 'A measured response',
      explanation: 'The source says this explicitly.',
      evidence: 'A measured response can change a discussion.',
    })) as { id: string };
    await expect(
      command('attempt.submit', {
        question_id: q.id,
        response: 'A measured response',
        evidence: 'invented quote',
      }),
    ).rejects.toThrow('supporting passage');
    const r = (await command('attempt.submit', {
      question_id: q.id,
      response: 'A measured response',
      evidence: 'A measured response',
    })) as { correct: boolean };
    expect(r.correct).toBe(true);
  });
  it('keeps subjective writing separate from objective accuracy', async () => {
    await command('attempt.submit', {
      question_id: 'q-attention-6',
      response: 'Attention grows with deliberate practice and a small collection worth revisiting.',
      evidence: 'attention, carefully practised, can become more generous.',
      self_assessment: 'revisit',
    });
    const s = await snapshot();
    expect(s.attempts.find((a) => a.question_id === 'q-attention-6')?.correct).toBe(null);
    expect(s.mistakes.some((m) => m.subjective)).toBe(true);
  });
  it('saves review history and prevents a duplicate concurrent submission', async () => {
    const s = await snapshot(),
      c = s.cards.find((c) => c.entry_id === entry.id)!;
    const input = {
      card_id: c.id,
      version: c.version,
      quality: 4,
      response: 'Careful and considered.',
    };
    const results = await Promise.allSettled([
      command('review.submit', input),
      command('review.submit', input),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const after = await snapshot();
    expect(after.reviews.filter((r) => r.card_id === c.id)).toHaveLength(1);
    expect(after.cards.find((v) => v.id === c.id)!.due_at > new Date().toISOString()).toBe(true);
  });
  it('merges duplicate concepts while preserving review history', async () => {
    const source = (await command('entry.save', {
      term: 'Cautious',
      meaning: 'Acting with care.',
    })) as Entry;
    const card = (await snapshot()).cards.find((c) => c.entry_id === source.id)!;
    await command('review.submit', { card_id: card.id, quality: 4, version: card.version });
    const before = (await snapshot()).reviews.length;
    await command('entry.merge', { source: source.id, target: entry.id });
    const after = await snapshot();
    expect(after.entries.some((e) => e.id === source.id)).toBe(false);
    expect(after.reviews.length).toBe(before);
  });
  it('exports and restores every learning table transactionally', async () => {
    const backup = await exportData();
    await command('entry.delete', { id: entry.id });
    await restoreData(backup);
    const s = await snapshot();
    expect(s.entries.find((e) => e.id === entry.id)).toBeTruthy();
    expect(s.annotations.some((a) => a.article_id === article.id)).toBe(true);
    expect(s.reviews.length).toBeGreaterThan(0);
    expect(s.lesson_progress.some((p) => p.completed)).toBe(true);
  });
  it('rolls back a restore with a broken foreign key', async () => {
    const backup = await exportData(),
      before = await snapshot();
    const broken = structuredClone(backup) as typeof backup;
    const rows = broken.tables.cards as Card[];
    rows[0].entry_id = 'missing-reference';
    await expect(restoreData(broken)).rejects.toThrow();
    const after = await snapshot();
    expect(after.entries.length).toBe(before.entries.length);
    expect(after.reviews.length).toBe(before.reviews.length);
  });
  it('validates backup anchors before touching existing data', async () => {
    const backup = await exportData();
    (backup.tables.annotations[0] as { quote: string }).quote = 'unrelated';
    await expect(restoreData(backup)).rejects.toThrow('anchor');
    expect((await snapshot()).articles.some((a) => a.id === article.id)).toBe(true);
  });
  it('returns an honest recoverable error for database failure', async () => {
    const original = globalThis.marginConnection;
    globalThis.marginConnection = Promise.reject(new Error('database unavailable'));
    try {
      const response = await GET(new Request('http://127.0.0.1:3000/api/workspace'));
      expect(response.status).toBe(503);
      expect((await response.json()).error).toContain('preserved');
    } finally {
      globalThis.marginConnection = original;
    }
    expect((await snapshot()).entries.length).toBeGreaterThan(0);
  });
  it('deleting a source keeps vocabulary and removes its annotations', async () => {
    await command('article.delete', { id: article.id });
    const s = await snapshot();
    expect(s.annotations.some((a) => a.article_id === article.id)).toBe(false);
    expect(s.entries.find((e) => e.id === entry.id)?.article_id).toBe(null);
  });
});
describe('local security and AI unavailability', () => {
  it('uses the validated Host for same-origin checks behind Next.js internal URLs', () => {
    const request = new Request('http://localhost:3000/api/workspace', {
      headers: {
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
        'Content-Type': 'application/json',
      },
    });
    expect(() => assertLocal(request, true)).not.toThrow();
    expect(localOrigin(request)).toBe('http://127.0.0.1:3000');
  });
  it('admits the cross-site OAuth callback only through its explicit callback boundary', () => {
    const request = new Request('http://127.0.0.1:3000/auth/callback', {
      headers: { 'sec-fetch-site': 'cross-site' },
    });
    expect(() => assertLocal(request)).toThrow('Cross-site');
    expect(() => assertLocal(request, false, true)).not.toThrow();
  });
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.20.1.1',
    '192.168.0.1',
    '169.254.169.254',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '224.1.1.1',
  ])('blocks private/reserved %s', (ip) => expect(isPublicAddress(ip)).toBe(false));
  it('allows public addresses', () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
  });
  it('respects a site’s extraction restriction', () =>
    expect(robotsAllowed('User-agent: *\nDisallow: /private', '/private/essay')).toBe(false));
  it('rejects hostile origins and host headers', () => {
    expect(() =>
      assertLocal(
        new Request('http://127.0.0.1:3000/api/workspace', {
          headers: { origin: 'https://evil.example' },
        }),
      ),
    ).toThrow('Cross-origin');
    expect(() => assertLocal(new Request('http://evil.example/api/workspace'))).toThrow(
      'localhost',
    );
  });
  it('AI is honestly disconnected without credentials', async () => {
    const status = await aiStatus();
    expect(status.connected).toBe(false);
    expect(status.plan_enabled).toBe(false);
    expect(JSON.stringify(status)).not.toContain('access_token');
  });
  it('accepts AI output only after a completion event', async () => {
    const body = new ReadableStream({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            'data: {"type":"response.output_text.delta","delta":"hello"}\n\ndata: {"type":"response.completed"}\n\n',
          ),
        );
        c.close();
      },
    });
    expect(await consumeStream(body)).toBe('hello');
  });
  it('rejects a truncated AI stream', async () => {
    const body = new ReadableStream({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            'data: {"type":"response.output_text.delta","delta":"partial"}\n\n',
          ),
        );
        c.close();
      },
    });
    await expect(consumeStream(body)).rejects.toThrow('before completion');
  });
  it('rejects a usage limit arriving after streaming begins', async () => {
    const body = new ReadableStream({
      start(c) {
        c.enqueue(
          new TextEncoder().encode(
            'data: {"type":"response.failed","response":{"error":{"code":"subscription_sharing_usage_limit_exceeded"}}}\n\n',
          ),
        );
        c.close();
      },
    });
    await expect(consumeStream(body)).rejects.toThrow('No separate API billing');
  });
});
