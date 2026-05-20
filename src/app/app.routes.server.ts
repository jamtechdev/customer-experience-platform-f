import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Landing page - can be prerendered
  { path: '', renderMode: RenderMode.Prerender },
  // Auth routes are client-rendered to avoid SSR/client duplicate form output.
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'forgot-password', renderMode: RenderMode.Client },
  { path: 'reset-password', renderMode: RenderMode.Client },
  // Protected routes need browser cookies for session hydration.
  // Server rendering cannot validate the HttpOnly session in the Angular guard.
  {
    path: 'app/**',
    renderMode: RenderMode.Client
  },
  // Fallback
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
