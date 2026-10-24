import { AppError } from './validation';
export function assertLocal(request: Request, mutation = false, callback = false) {
  const url = new URL(request.url);
  const host = request.headers.get('host') || url.host;
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))
    throw new AppError(403, 'Margin accepts only localhost requests.');
  const origin = request.headers.get('origin');
  if (!callback && origin && origin !== url.protocol + '//' + host)
    throw new AppError(403, 'Cross-origin requests are not allowed.');
  if (!callback && request.headers.get('sec-fetch-site') === 'cross-site')
    throw new AppError(403, 'Cross-site requests are not allowed.');
  if (mutation && request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    throw new AppError(415, 'Use application/json.');
}

export function localOrigin(request: Request, callback = false) {
  assertLocal(request, false, callback);
  return (
    new URL(request.url).protocol +
    '//' +
    (request.headers.get('host') || new URL(request.url).host)
  );
}
