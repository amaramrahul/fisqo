import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../errors.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOOPBACK_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1']);

function hostnameOf(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : `http://${value}`);
    // Node renders IPv6 hostnames in bracket form, for example "[::1]".
    return url.hostname.replace(/^\[|\]$/g, '');
  } catch {
    return null;
  }
}

function isLoopback(value: string | undefined): boolean {
  if (value === undefined || value === '') return false;
  const hostname = hostnameOf(value);
  return hostname !== null && LOOPBACK_HOSTNAMES.has(hostname);
}

/**
 * Binding Express to 127.0.0.1 keeps the network out, but it does not keep out
 * a page in the user's own browser. Two checks close that gap:
 *
 *  - Host validation on every request. A DNS-rebound request arrives carrying
 *    the attacker's hostname, not a loopback address.
 *  - Origin validation on state-changing requests. A browser will not let a
 *    foreign page forge Origin, and it always sends it on a cross-origin POST.
 *
 * Any loopback origin is accepted, which lets the Vite dev server on port 5173
 * talk to the API without a special case. A malicious page cannot have a
 * loopback origin unless it is already served from the user's machine.
 *
 * Non-browser clients such as curl must send an explicit Origin header.
 */
export function loopbackGuard(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!isLoopback(req.headers.host)) {
      next(new ApiError(403, 'FORBIDDEN_ORIGIN', 'Request Host is not a loopback address.'));
      return;
    }

    if (STATE_CHANGING_METHODS.has(req.method)) {
      const origin = req.headers.origin ?? req.headers.referer;
      if (!isLoopback(origin)) {
        next(new ApiError(403, 'FORBIDDEN_ORIGIN', 'Request Origin is not a loopback address.'));
        return;
      }
    }

    next();
  };
}
