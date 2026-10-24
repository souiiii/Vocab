import { NextResponse } from 'next/server';
import { failure } from '@/lib/errors';
import { snapshot, command } from '@/lib/service';
import { importArticle } from '@/lib/importer';
import { assertLocal } from '@/lib/security';
import { AppError } from '@/lib/validation';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    assertLocal(request);
    return NextResponse.json(await snapshot(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertLocal(request, true);
    if (Number(request.headers.get('content-length')) > 2_000_000)
      throw new AppError(413, 'Request too large.');
    const body = await request.json();
    if (body.action === 'article.extract') {
      if (typeof body.data?.url !== 'string') throw new AppError(400, 'Enter an article URL.');
      return NextResponse.json(await importArticle(body.data.url));
    }
    return NextResponse.json(await command(body.action, body.data));
  } catch (e) {
    return failure(e);
  }
}
