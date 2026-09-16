// Preview bypasses are explicitly enabled and accepted only over local sockets.
export function isLocalPreviewRequest(req, environment = process.env) {
  if (environment.NODE_ENV !== 'development' || environment.VERCEL) return false;
  if (environment.LOCAL_PREVIEW !== 'true') return false;
  if (req.headers?.['x-forwarded-for']) return false;
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress);
}
