import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'layouts', pathMatch: 'full' },
  {
    path: 'layouts',
    loadComponent: () =>
      import('./features/layout-list/layout-list.component').then(
        (m) => m.LayoutListComponent,
      ),
  },
  {
    path: 'config/:id',
    loadComponent: () =>
      import('./features/layout-config/layout-config.component').then(
        (m) => m.LayoutConfigComponent,
      ),
  },
  {
    path: 'render',
    loadComponent: () =>
      import('./features/render/render.component').then((m) => m.RenderComponent),
  },
];
