import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('reading, highlighting, collection, lessons, comprehension, review and backup', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A little reading/ })).toBeVisible();
  await mkdir('.local/qa', { recursive: true });
  await page.screenshot({ path: '.local/qa/dashboard.png', fullPage: true });
  const title = 'Browser verification ' + Date.now();
  await page.getByRole('button', { name: 'Add something to read', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title', { exact: true }).fill(title);
  await dialog
    .getByLabel('Article text', { exact: false })
    .fill(
      'A measured response can make a difficult conversation more productive. Attention grows through deliberate practice.\n\nA reader returns to the passage and notices something new.',
    );
  await dialog.getByRole('button', { name: 'Add to reading room', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.getByTestId('article-content').evaluate((node) => {
    const text = node.querySelector('span')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 19);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Highlight', exact: true }).click();
  await expect(page.locator('mark')).toHaveText('A measured response');
  await page.getByRole('button', { name: '+ Add a thought', exact: true }).click();
  await page.getByLabel('Your note').fill('A restrained reaction, suited to the context.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('mark')).toHaveText('A measured response');
  await expect(page.getByText('A restrained reaction, suited to the context.')).toBeVisible();
  await page.getByTestId('article-content').evaluate((node) => {
    const text = node.querySelector('mark')!.firstChild!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    node.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.getByRole('button', { name: 'Collect', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByLabel('Word or expression', { exact: true })
    .fill('Measured response ' + Date.now());
  await page.getByLabel('Meaning or rule').fill('A considered and restrained reaction.');
  await page.getByRole('button', { name: 'Save to collection', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Grammar studio', exact: true }).click();
  await page.getByRole('button', { name: /01 Tense & aspect/ }).click();
  await page.getByRole('radio', { name: /had begun/ }).click();
  await page.getByRole('button', { name: 'Consider my answer', exact: true }).first().click();
  await expect(page.getByText('Well understood.', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /I have been reading for an hour/ }).click();
  await page.getByRole('button', { name: 'Consider my answer', exact: true }).click();
  await page.getByRole('button', { name: 'Complete this topic', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Topic completed', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Comprehension', exact: true }).click();
  await page
    .getByLabel('Explore a piece from your reading room')
    .selectOption({ label: 'The quiet art of paying attention' });
  const first = page.locator('.exercise').first();
  await first.getByRole('radio', { name: /Select a sentence that changed your mind/ }).click();
  await first
    .getByLabel('Support your answer with evidence', { exact: false })
    .fill('Select the sentence that changed your mind.');
  await first.getByRole('button', { name: 'Consider my answer', exact: true }).click();
  await expect(first.getByText('Well understood.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create a question', exact: true }).click();
  const q = page.getByRole('dialog');
  await q.getByLabel('Question', { exact: true }).fill('What is a useful reading practice?');
  await q.getByLabel('Answer options (one per line)').fill('Reflect\nRush');
  await q.getByLabel('Correct answer (exactly one of the options)').fill('Reflect');
  await q.getByLabel('Explanation', { exact: true }).fill('The essay recommends reflection.');
  await q
    .getByLabel('Supporting source passage (exact quotation)')
    .fill('whether the way we use it makes room for reflection.');
  await q.getByRole('button', { name: 'Save question', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'What is a useful reading practice?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Daily review/ }).click();
  await page.getByRole('textbox', { name: 'Your recalled answer' }).fill('A considered response.');
  await page.getByRole('button', { name: /Turn the card/ }).click();
  await page.getByRole('button', { name: /3 Good/ }).click();
  await expect(page.getByText('1 revisited this session', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings & connections', exact: true }).click();
  await expect(page.getByText('AI is not connected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue with ChatGPT/ })).toBeDisabled();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all learning data', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/margin-backup/);
  const path = await file.path();
  expect(path).toBeTruthy();
  await page.locator('input[type=file]').setInputFiles(path!);
  await page.getByRole('textbox', { name: 'Type REPLACE to confirm' }).fill('REPLACE');
  await page.getByRole('button', { name: 'Replace and restore', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Your learning data was restored successfully.')).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile navigation, readable layouts and dark theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A little reading/ })).toBeVisible();
  await page.screenshot({ path: '.local/qa/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('button', { name: 'My collection', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Words worth keeping/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Toggle dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: '.local/qa/mobile-dark.png', fullPage: true });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Toggle dark theme', exact: true }).click();
});

test('manual sentence analysis and subjective mistake reflections work without AI', async ({
  page,
}) => {
  await page.goto('/?view=sentence');
  await page.getByLabel('A sentence to explore').fill('Rarely does a reader notice every choice.');
  await page
    .getByLabel('01 / Clause structure')
    .fill('One main clause with subject–auxiliary inversion.');
  await page.getByLabel('03 / Tense & constructions').fill('Present simple with do-support.');
  await page.getByLabel('A name for this construction').fill('Restrictive inversion ' + Date.now());
  await page
    .getByRole('button', { name: 'Save construction & follow-up practice', exact: true })
    .click();
  await expect(
    page.getByText('Construction saved with identification and rewriting practice.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mistake notebook', exact: true }).click();
  await page.getByRole('button', { name: 'Add a reflection', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Original question or writing task').fill('Choose a more precise verb.');
  await dialog.getByLabel('What I wrote').fill('The argument is very good.');
  await dialog.getByLabel('Correction or feedback').fill('The argument is persuasive.');
  await dialog.getByRole('button', { name: 'Save reflection', exact: true }).click();
  await expect(page.getByText('Writing improvement · subjective', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'I’ve reflected on this', exact: true }).click();
  await page.getByRole('button', { name: 'Reflected on', exact: true }).click();
  await expect(page.getByText('The argument is persuasive.', { exact: true })).toBeVisible();
});

test('database error recovery and restricted URL extraction are actionable', async ({ page }) => {
  await page.route(
    '**/api/workspace',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'The database is temporarily unavailable. Your existing data is preserved.',
        }),
      }),
    { times: 1 },
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Your workspace couldn’t be opened', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: /A little reading/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add something to read', exact: true }).click();
  await page.getByRole('button', { name: 'Import a link', exact: true }).click();
  await page.getByLabel('Article URL').fill('http://127.0.0.1/private-article');
  await page.getByRole('button', { name: 'Extract article', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Private, local and reserved network addresses' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  await expect(page.getByLabel('Article text', { exact: false })).toBeVisible();
});
