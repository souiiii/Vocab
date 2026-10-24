import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { mkdtemp, readFile, stat, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startSignIn, completeSignIn, aiStatus, models, infer } from '../src/lib/ai';
import { POST } from '../src/app/api/ai/route';
let dir: string;
let nonce = '';
let token = '';
let scopes = 'openid email offline_access resource.invoke chatgpt.tokens.use.direct';
let refreshes = 0;
let output: Record<string, unknown>;
let client = 'oaiapp_test_registration';
let privateKey: CryptoKey;
let publicJwk: Record<string, unknown>;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'margin-oauth-'));
  process.env.AI_DATA_DIR = dir;
  globalThis.marginAiQueue = undefined;
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  publicJwk = { ...(await exportJWK(keys.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  scopes = 'openid email offline_access resource.invoke chatgpt.tokens.use.direct';
  refreshes = 0;
  output = {
    explanation: 'Inversion foregrounds the restrictive adverbial.',
    examples: ['Rarely does a reader pause.'],
    practice: 'Rewrite a sentence using rarely.',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith('openid-configuration'))
        return Response.json({
          issuer: 'https://auth.openai.com',
          authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize',
          token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token',
          jwks_uri: 'https://auth.openai.com/.well-known/jwks.json',
          revocation_endpoint: 'https://auth.openai.com/oauth/revoke',
        });
      if (u.endsWith('jwks.json')) return Response.json({ keys: [publicJwk] });
      if (u.endsWith('/oauth/token')) {
        const body = new URLSearchParams(String(init?.body));
        expect(body.get('client_id')).toBe(client);
        expect(body.has('client_secret')).toBe(false);
        if (body.get('grant_type') === 'refresh_token') refreshes++;
        return Response.json({
          access_token: 'fake-access',
          refresh_token: 'fake-rotated-refresh',
          id_token: token,
          scope: scopes,
          expires_in: 3600,
        });
      }
      if (u.endsWith('/models'))
        return Response.json({
          models: [
            { slug: 'permitted-model', display_name: 'Permitted model', visibility: 'list' },
            { slug: 'hidden-model', display_name: 'Hidden', visibility: 'hidden' },
          ],
        });
      if (u.endsWith('/responses')) {
        const request = JSON.parse(String(init?.body));
        expect(request.store).toBe(false);
        expect(request.stream).toBe(true);
        expect(request.model).toBe('permitted-model');
        expect(Array.isArray(request.input)).toBe(true);
        expect(request.max_output_tokens).toBeUndefined();
        return new Response(
          'data: ' +
            JSON.stringify({ type: 'response.output_text.delta', delta: JSON.stringify(output) }) +
            '\n\ndata: {"type":"response.completed"}\n\n',
          { headers: { 'Content-Type': 'text/event-stream' } },
        );
      }
      throw new Error('Unexpected mocked endpoint');
    }),
  );
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});
async function begin() {
  const started = await startSignIn('http://127.0.0.1:3000');
  const url = new URL(started.url);
  nonce = url.searchParams.get('nonce')!;
  token = await new SignJWT({ nonce, email: 'test@example.invalid' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject('test-subject')
    .setIssuer('https://auth.openai.com')
    .setAudience(client)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  const callback = new URLSearchParams({
    state: url.searchParams.get('state')!,
    code: 'fake-code',
    client_id: client,
  });
  return { ...started, url, callback };
}
describe('documented local OAuth contract, with mocked OpenAI responses', () => {
  it('completes plan inference with a validated result and explicit usage attribution', async () => {
    const f = await begin();
    await completeSignIn(f.browser, f.callback);
    const result = await infer({
      task: 'grammar',
      model: 'permitted-model',
      text: 'Explain inversion.',
      context: '',
    });
    expect(result.result).toEqual(output);
    expect(result.billing).toBe('chatgpt-plan');
    const status = await aiStatus();
    expect(status.verified_live).toBe(true);
    expect(status.usage[0].billing).toBe('chatgpt-plan');
  });
  it('rejects a model absent from the authenticated catalog', async () => {
    const f = await begin();
    await completeSignIn(f.browser, f.callback);
    await expect(
      infer({ task: 'grammar', model: 'unavailable', text: 'Explain inversion.', context: '' }),
    ).rejects.toThrow('available');
  });
  it('rejects comprehension output whose evidence is absent from the source', async () => {
    const f = await begin();
    await completeSignIn(f.browser, f.callback);
    output = {
      questions: [
        {
          type: 'inference',
          prompt: 'What changes attention?',
          options: ['Practice', 'Haste'],
          answer: 'Practice',
          explanation: 'The writer supports practice.',
          evidence: 'An invented quotation.',
          subjective: false,
        },
      ],
    };
    await expect(
      infer({
        task: 'comprehension',
        model: 'permitted-model',
        text: 'Create a question.',
        context: 'Attention grows with practice.',
      }),
    ).rejects.toThrow('evidence');
  });
  it('requires explicit authorization before initiating OAuth', async () => {
    const r = await POST(
      new Request('http://127.0.0.1:3000/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', consent: false }),
      }),
    );
    expect(r.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses dynamic registration, PKCE and a persistent opaque host', async () => {
    const first = await begin(),
      second = await begin();
    expect(first.url.searchParams.get('client_id')).toBe('dynamic_agent_client');
    expect(first.url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(first.url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:3000/auth/callback');
    expect(first.url.searchParams.get('ext_agent_host_id')).toBe(
      second.url.searchParams.get('ext_agent_host_id'),
    );
    expect(first.url.searchParams.get('state')).not.toBe(second.url.searchParams.get('state'));
  });
  it('validates a signed identity, stores owner-only credentials and hides tokens', async () => {
    const f = await begin();
    expect(await completeSignIn(f.browser, f.callback)).toBe(true);
    const status = await aiStatus();
    expect(status.plan_enabled).toBe(true);
    expect(JSON.stringify(status)).not.toContain('fake-access');
    expect((await stat(path.join(dir, 'credentials.json'))).mode & 0o777).toBe(0o600);
    await expect(completeSignIn(f.browser, f.callback)).rejects.toThrow('expired or invalid');
  });
  it('rejects mismatched state without accepting the identity', async () => {
    const f = await begin();
    f.callback.set('state', 'wrong-state');
    await expect(completeSignIn(f.browser, f.callback)).rejects.toThrow('invalid');
    expect((await aiStatus()).connected).toBe(false);
  });
  it('rejects an ID token with the wrong nonce', async () => {
    const f = await begin();
    token = await new SignJWT({ nonce: 'wrong' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('test-subject')
      .setIssuer('https://auth.openai.com')
      .setAudience(client)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    await expect(completeSignIn(f.browser, f.callback)).rejects.toThrow('identity');
    expect((await aiStatus()).connected).toBe(false);
  });
  it('preserves identity-only sign-in but disables missing plan permission', async () => {
    const f = await begin();
    scopes = 'openid profile email';
    expect(await completeSignIn(f.browser, f.callback)).toBe(false);
    expect((await aiStatus()).plan_enabled).toBe(false);
    await expect(models()).rejects.toThrow('authorize plan usage');
  });
  it('handles declined consent without exchanging an authorization code', async () => {
    const f = await begin();
    f.callback.set('error', 'access_denied');
    await expect(completeSignIn(f.browser, f.callback)).rejects.toThrow('declined');
    expect((await aiStatus()).connected).toBe(false);
  });
  it('reuses an issued registration on reauthorization', async () => {
    const f = await begin();
    await completeSignIn(f.browser, f.callback);
    const returning = await startSignIn('http://127.0.0.1:3000', client);
    const url = new URL(returning.url);
    expect(url.searchParams.get('client_id')).toBe(client);
    expect(url.searchParams.has('agent_name_hint')).toBe(false);
    expect(url.searchParams.has('id_token_hint')).toBe(false);
  });
  it('serializes refreshes and uses account-specific visible models', async () => {
    const f = await begin();
    await completeSignIn(f.browser, f.callback);
    const filename = path.join(dir, 'credentials.json'),
      vault = JSON.parse(await readFile(filename, 'utf8'));
    vault.accounts[0].expires_at = 0;
    await writeFile(filename, JSON.stringify(vault), { mode: 0o600 });
    const results = await Promise.all([models(), models()]);
    expect(refreshes).toBe(1);
    expect(results[0]).toEqual([{ id: 'permitted-model', name: 'Permitted model' }]);
  });
});
