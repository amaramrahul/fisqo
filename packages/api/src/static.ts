import path from 'node:path';
import express from 'express';
import type { Express } from 'express';

/**
 * Serves the built SPA from the same origin as the API. Same-origin delivery is
 * what removes the need for a CORS layer and lets the dev proxy mirror
 * production. It also means the SPA is reachable from any browser on this
 * machine, which is accepted deliberately - see the design spec.
 */
export function serveWebApp(app: Express, webDist: string): void {
  app.use(express.static(webDist));

  // Anything that is not an API route falls through to the SPA shell.
  app.get('/*splat', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}
