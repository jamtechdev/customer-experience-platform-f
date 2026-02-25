import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public routes - can be prerendered
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'signup', renderMode: RenderMode.Prerender },
  { path: 'forgot-password', renderMode: RenderMode.Prerender },
  // Protected routes with dynamic parameters should use Server rendering
  { path: 'app/feedback/:id', renderMode: RenderMode.Server },
  { path: 'app/cx/journeys/:id', renderMode: RenderMode.Server },
  { path: 'app/surveys/:id/results', renderMode: RenderMode.Server },
  // All other protected routes use Server rendering
  {
    path: 'app/**',
    renderMode: RenderMode.Server
  },
  // Fallback
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
