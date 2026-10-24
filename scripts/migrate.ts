import { db } from '../src/lib/db';
await db();
console.log('Database migrations applied successfully.');
process.exit(0);
