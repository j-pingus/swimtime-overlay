import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'config', pathMatch: 'full' },
  {
    path: 'config',
    loadComponent: () =>
      import('./features/config/config.component').then((m) => m.ConfigComponent),
  },
  {
    path: 'render',
    loadComponent: () =>
      import('./features/render/render.component').then((m) => m.RenderComponent),
  },
];
