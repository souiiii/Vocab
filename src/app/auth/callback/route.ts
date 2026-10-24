import { NextRequest, NextResponse } from 'next/server';
import { completeSignIn } from '@/lib/ai';
import { assertLocal, localOrigin } from '@/lib/security';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  let message = '';
  try {
    assertLocal(request, false, true);
    const enabled = await completeSignIn(
      request.cookies.get('margin_oauth')?.value || '',
      request.nextUrl.searchParams,
    );
    message = enabled
      ? 'ChatGPT connected. Plan usage is authorized.'
      : 'Signed in, but ChatGPT plan usage was not authorized.';
  } catch (e) {
    message = e instanceof Error ? e.message : 'ChatGPT sign-in failed.';
  }
  const response = NextResponse.redirect(
    new URL(
      '/?view=settings&connection=' + encodeURIComponent(message),
      localOrigin(request, true),
    ),
  );
  response.cookies.delete('margin_oauth');
  return response;
}
