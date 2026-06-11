import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const browserIndexFile = join(browserDistFolder, 'index.html');
const defaultAllowedHosts = new Set([
  'sentimenter.ai',
  'www.sentimenter.ai',
  'localhost',
  '127.0.0.1',
  '::1',
]);
const configuredAllowedHosts = (process.env['SSR_ALLOWED_HOSTS'] || process.env['ALLOWED_HOSTS'] || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

for (const host of configuredAllowedHosts) {
  defaultAllowedHosts.add(host);
}

const app = express();
const angularApp = new AngularNodeAppEngine();

function isAllowedSsrHost(hostname: string | undefined): boolean {
  const normalized = (hostname || '').toLowerCase();
  if (!normalized) return false;
  return defaultAllowedHosts.has(normalized) || normalized.endsWith('.sentimenter.ai');
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Avoid Angular SSRF host-protection warnings for direct-IP/bot traffic.
 * Unknown hosts still get the browser app for HTML routes; missing assets return 404.
 */
app.use((req, res, next) => {
  if (isAllowedSsrHost(req.hostname)) {
    next();
    return;
  }

  if (req.path.includes('.')) {
    res.sendStatus(404);
    return;
  }

  res.sendFile(browserIndexFile);
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch((err) => {
      console.error('SSR render error:', err?.message ?? err);
      next(err);
    });
});

/**
 * Final error handler: avoid unhandled errors when SSR or next() fails.
 */
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: 'Server error', code: 500 });
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on port ${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
