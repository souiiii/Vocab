import { NextResponse } from 'next/server';
import { z } from 'zod';
import { aiStatus, startSignIn, disconnect, selectAccount, models, aiInput, infer } from '@/lib/ai';
import { assertLocal, localOrigin } from '@/lib/security';
import { AppError } from '@/lib/validation';
import { failure } from '@/lib/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    assertLocal(request);
    if (new URL(request.url).searchParams.has('models')) return NextResponse.json(await models());
    return NextResponse.json(await aiStatus());
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    assertLocal(request, true);
    const body = await request.json();
    if (body.action === 'connect') {
      if (body.consent !== true)
        throw new AppError(400, 'Explicit consent to use your ChatGPT plan is required.');
      const { browser, url } = await startSignIn(
        localOrigin(request),
        z.string().optional().parse(body.account),
      );
      const response = NextResponse.json({ url });
      response.cookies.set('margin_oauth', browser, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      });
      return response;
    }
    if (body.action === 'disconnect') return NextResponse.json(await disconnect());
    if (body.action === 'select') {
      await selectAccount(z.string().parse(body.account));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(await infer(aiInput.parse(body)));
  } catch (e) {
    return failure(e);
  }
}
