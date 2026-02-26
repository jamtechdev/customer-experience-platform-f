import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Landing page - can be prerendered
  { path: '', renderMode: RenderMode.Prerender },
  // Auth routes - use server rendering to handle auth state properly
  { path: 'login', renderMode: RenderMode.Server },
  { path: 'signup', renderMode: RenderMode.Server },
  { path: 'forgot-password', renderMode: RenderMode.Server },
  { path: 'reset-password', renderMode: RenderMode.Server },
  // All protected routes use Server rendering
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
