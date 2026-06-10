import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { LayoutStore } from './core/services/layout.store';
import { LayoutSyncService } from './core/services/layout-sync.service';
import { CompetitionSyncService } from './core/services/competition-sync.service';
import { CompetitionStore } from './core/services/competition.store';
import { LiveDataService } from './core/services/live-data.service';

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
        const competitionStore = inject(CompetitionStore);
        const liveData = inject(LiveDataService);
        inject(LayoutSyncService);
        inject(CompetitionSyncService);
        return async () => {
          await layoutStore.init();
          // Restore live SSE subscriptions if the user had live mode active before the reload.
          if (competitionStore.mode() === 'live') {
            liveData.start();
          }
        };
      },
      multi: true,
    },
  ],
};
