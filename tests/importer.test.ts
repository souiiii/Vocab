import { describe, it, expect } from 'vitest';
import { extractPage, robotsAllowed, importArticle } from '../src/lib/importer';
const paragraph =
  'A careful reader pays attention to the relationship between an argument and its evidence. Reading slowly makes the choices of the writer more visible. A small collection of meaningful sentences can become the beginning of a lasting practice.';
const html =
  '<html><head><title>A considered reading practice</title><meta property="og:site_name" content="Original Reading Journal"><meta name="author" content="A Writer"></head><body><nav>Unwanted navigation</nav><article><h1>A considered reading practice</h1><p>' +
  paragraph +
  '</p><p>' +
  paragraph +
  '</p><p>' +
  paragraph +
  '</p></article><script>window.untrusted = true</script></body></html>';
describe('clean article extraction', () => {
  it('extracts plain paragraphs and source metadata without executable content', () => {
    const result = extractPage(html, new URL('https://example.org/essay'));
    expect(result.title).toContain('considered reading');
    expect(result.content).toContain(paragraph);
    expect(result.content).not.toContain('<script>');
    expect(result.content).not.toContain('window.untrusted');
    expect(result.url).toBe('https://example.org/essay');
    expect(result.source).toBe('Original Reading Journal');
  });
  it('rejects a detected paywall', () =>
    expect(() =>
      extractPage(
        html.replace('<article>', '<div class="paywall">Subscribe</div><article>'),
        new URL('https://example.org/essay'),
      ),
    ).toThrow('restrict access'));
  it('rejects structured paid access', () =>
    expect(() =>
      extractPage(
        html.replace(
          '</head>',
          '<script type="application/ld+json">{"isAccessibleForFree":false}</script></head>',
        ),
        new URL('https://example.org/essay'),
      ),
    ).toThrow('restrict access'));
  it('honours a restriction for multiple agents in one group', () =>
    expect(
      robotsAllowed('User-agent: *\nUser-agent: Other\nDisallow: /restricted', '/restricted/essay'),
    ).toBe(false));
  it('does not ignore encoded or end-anchored restricted paths', () => {
    expect(robotsAllowed('User-agent: *\nDisallow: /private$', '/private')).toBe(false);
    expect(robotsAllowed('User-agent: *\nDisallow: /private', '/%70rivate/page')).toBe(false);
  });
  it('returns an actionable extraction error for an invalid source', async () => {
    await expect(importArticle('not a url')).rejects.toThrow('valid article URL');
  });
});
