import { NextResponse } from 'next/server';
import { exportData, restoreData } from '@/lib/backup';
import { assertLocal } from '@/lib/security';
import { AppError } from '@/lib/validation';
import { failure } from '@/lib/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    assertLocal(request);
    return NextResponse.json(await exportData(), {
      headers: {
        'Content-Disposition':
          'attachment; filename="margin-backup-' + new Date().toISOString().slice(0, 10) + '.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertLocal(request, true);
    if (request.headers.get('x-margin-restore') !== 'REPLACE')
      throw new AppError(400, 'Explicit restore confirmation is required.');
    const text = await request.text();
    if (text.length > 30_000_000) throw new AppError(413, 'Backup exceeds 30 MB.');
    await restoreData(JSON.parse(text));
    return NextResponse.json({ restored: true });
  } catch (e) {
    return failure(e);
  }
}
