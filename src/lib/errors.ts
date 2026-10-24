import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './validation';
export function failure(e: unknown) {
  if (e instanceof ZodError)
    return NextResponse.json({ error: e.issues.map((i) => i.message).join(' ') }, { status: 400 });
  if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
  const code = (e as { code?: string })?.code;
  if (code === '23505')
    return NextResponse.json({ error: 'This record already exists.' }, { status: 409 });
  if (code === '23503')
    return NextResponse.json(
      { error: 'A linked record was not found. No changes were saved.' },
      { status: 400 },
    );
  console.error(
    'Workspace operation failed:',
    e instanceof Error ? e.name : 'Unknown error',
    code || '',
  );
  return NextResponse.json(
    {
      error:
        'The operation could not be saved. Check the database connection and try again. Your existing data has been preserved.',
    },
    { status: 503 },
  );
}
