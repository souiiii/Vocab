import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import { AppError } from './validation';
export function isPublicAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return (
      /^[23]/.test(v) &&
      !v.startsWith('::') &&
      !v.startsWith('fc') &&
      !v.startsWith('fd') &&
      !v.startsWith('fe') &&
      !v.startsWith('ff') &&
      !v.startsWith('2001:db8') &&
      !v.startsWith('64:ff9b') &&
      !v.startsWith('2002:')
    );
  }
  if (isIP(ip) !== 4) return false;
  const [a, b] = ip.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0)
  );
}
async function getPublic(
  url: URL,
  redirects = 0,
  beforeRedirect?: (next: URL) => Promise<void>,
): Promise<{ body: string; type: string; status: number; url: URL }> {
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port))
  )
    throw new AppError(400, 'Use a public HTTP or HTTPS URL on a standard port.');
  const records = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
  if (!records.length || records.some((r) => !isPublicAddress(r.address)))
    throw new AppError(400, 'Private, local and reserved network addresses cannot be imported.');
  return new Promise((resolve, reject) => {
    const record = records[0];
    const request = (url.protocol === 'https:' ? https : http).get(
      url,
      {
        headers: {
          'User-Agent': 'MarginReader/1.0 (personal article reader)',
          Accept: 'text/html,text/plain',
        },
        lookup: (_host, options, callback) =>
          options.all ? callback(null, [record]) : callback(null, record.address, record.family),
      },
      (response) => {
        const status = response.statusCode || 500;
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.resume();
          if (redirects >= 3 || !response.headers.location) {
            reject(new AppError(400, 'Too many article redirects.'));
            return;
          }
          const next = new URL(response.headers.location, url);
          (beforeRedirect ? beforeRedirect(next) : Promise.resolve())
            .then(() => getPublic(next, redirects + 1, beforeRedirect))
            .then(resolve, reject);
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 3_000_000) {
            request.destroy(
              new AppError(413, 'This page is too large. Paste the article text instead.'),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            type: response.headers['content-type'] || '',
            status,
            url,
          }),
        );
        response.on('error', reject);
      },
    );
    request.setTimeout(12000, () =>
      request.destroy(
        new AppError(408, 'The source took too long. Paste the article text instead.'),
      ),
    );
    request.on('error', reject);
  });
}
export function robotsAllowed(text: string, pathname: string) {
  let applicable = false;
  let hasRules = false;
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim(),
      split = line.indexOf(':');
    if (split < 0) continue;
    const key = line.slice(0, split).toLowerCase(),
      value = line.slice(split + 1).trim();
    if (key === 'user-agent') {
      if (hasRules) {
        applicable = false;
        hasRules = false;
      }
      applicable ||= value === '*' || value.toLowerCase().includes('margin');
    }
    if (key === 'disallow' || key === 'allow') hasRules = true;
    if (
      applicable &&
      key === 'disallow' &&
      value &&
      (value === '/' || decode(pathname).startsWith(decode(value.split('*')[0].replace(/\$$/, ''))))
    )
      return false;
  }
  return true;
}
export async function importArticle(raw: string) {
  try {
    return await importPublicArticle(raw);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      422,
      'This source could not be extracted. Check the URL or paste text you have permission to use.',
    );
  }
}
async function importPublicArticle(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError(400, 'Enter a valid article URL.');
  }
  async function checkPolicy(target: URL) {
    const robots = await getPublic(new URL('/robots.txt', target));
    if (robots.status === 200 && !robotsAllowed(robots.body, target.pathname + target.search))
      throw new AppError(
        403,
        'This site restricts automated access. Paste text you have permission to use.',
      );
    if (robots.status !== 200 && robots.status !== 404)
      throw new AppError(
        403,
        'Cannot verify this site’s access policy. Paste permitted text instead.',
      );
  }
  await checkPolicy(url);
  const page = await getPublic(url, 0, checkPolicy);
  if (page.status !== 200)
    throw new AppError(
      422,
      'The source declined access. Paste text you have permission to use; access restrictions are never bypassed.',
    );
  if (!page.type.includes('text/html'))
    throw new AppError(422, 'This is not an HTML article. Paste its text instead.');
  return extractPage(page.body, page.url);
}
export function extractPage(html: string, url: URL) {
  const { document } = parseHTML(html);
  const restricted = document.querySelector('[class*="paywall"], [id*="paywall"], [data-paywall]');
  const structured = [...document.querySelectorAll('script[type="application/ld+json"]')].some(
    (n) => /"isAccessibleForFree"\s*:\s*(false|"false")/i.test(n.textContent || ''),
  );
  if (restricted || structured)
    throw new AppError(
      403,
      'This article appears to restrict access. Paste an excerpt you have permission to use.',
    );
  const extracted = new Readability(document as unknown as Document, {
    charThreshold: 150,
  }).parse();
  if (!extracted || !extracted.textContent || extracted.textContent.trim().length < 150)
    throw new AppError(
      422,
      'A readable article could not be extracted. Use the text import instead.',
    );
  const { document: clean } = parseHTML(extracted.content || '');
  const blocks = [...clean.querySelectorAll('p,h1,h2,h3,blockquote,li')]
    .filter((n) => !n.querySelector('p,h1,h2,h3,blockquote,li'))
    .map((n) => (n.textContent || '').trim())
    .filter(Boolean);
  const content = blocks.length ? blocks.join('\n\n') : extracted.textContent.trim();
  if (content.length > 500000)
    throw new AppError(
      413,
      'This text exceeds the 500,000-character article limit. Paste a shorter excerpt instead.',
    );
  return {
    title: extracted.title || 'Untitled article',
    author: extracted.byline || '',
    source: extracted.siteName || url.hostname,
    url: url.href,
    published: extracted.publishedTime || '',
    category: 'Articles',
    content,
  };
}
