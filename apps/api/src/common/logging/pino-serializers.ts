import type { IncomingMessage, ServerResponse } from 'http';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
]);

const REDACTED = '[Redacted]';

function redactHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      result[key] = REDACTED;
    } else {
      result[key] = value;
    }
  }

  return result;
}

function scrubUrl(url: string): string {
  return url.replace(
    /([?&])(token|email|password|secret)=([^&]*)/gi,
    '$1$2=[Redacted]',
  );
}

export function reqSerializer(req: IncomingMessage & { id?: string }) {
  return {
    id: req.id,
    method: req.method,
    url: scrubUrl(req.url ?? ''),
    headers: redactHeaders(req.headers as unknown as Record<string, unknown>),
    remoteAddress: req.socket?.remoteAddress,
    remotePort: req.socket?.remotePort,
  };
}

export function resSerializer(res: ServerResponse) {
  const headers =
    typeof res.getHeaders === 'function'
      ? (res.getHeaders() as unknown as Record<string, unknown>)
      : {};

  return {
    statusCode: res.statusCode,
    headers: redactHeaders(headers),
  };
}
