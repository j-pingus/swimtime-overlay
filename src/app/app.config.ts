import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { LayoutStore } from './core/services/layout.store';
import { LayoutSyncService } from './core/services/layout-sync.service';
import { CompetitionSyncService } from './core/services/competition-sync.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    // Eagerly instantiate sync services so BroadcastChannel is open in every window.
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const layoutStore = inject(LayoutStore);
        inject(LayoutSyncService);
        inject(CompetitionSyncService);
        return () => layoutStore.init();
      },
      multi: true,
    },
  ],
};
