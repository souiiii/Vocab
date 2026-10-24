import { snapshot, command } from '../src/lib/service';
import { db } from '../src/lib/db';
async function main() {
  if (process.argv[2] === 'write') {
    const entry = (await command('entry.save', {
      term: 'durable-recall-check',
      meaning: 'A review survives a process restart.',
    })) as { id: string };
    const s = await snapshot(),
      card = s.cards.find((c) => c.entry_id === entry.id)!;
    await command('review.submit', {
      card_id: card.id,
      quality: 4,
      version: card.version,
      response: 'A durable saved answer.',
    });
  } else {
    const s = await snapshot(),
      entry = s.entries.find((e) => e.term === 'durable-recall-check');
    if (!entry) throw new Error('Entry did not survive restart.');
    const cards = s.cards.filter((c) => c.entry_id === entry.id),
      review = s.reviews.find((r) => cards.some((c) => c.id === r.card_id));
    if (
      !review ||
      review.response !== 'A durable saved answer.' ||
      !cards.some((c) => c.interval === 1 && c.repetitions === 1)
    )
      throw new Error('Review scheduling did not survive restart.');
    console.log(
      'Verified: entry, response, review history and due schedule survived process restart.',
    );
  }
}
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
