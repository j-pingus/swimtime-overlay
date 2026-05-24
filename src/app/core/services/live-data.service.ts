import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../api/api.service';
import { SseService } from '../api/sse.service';
import { mapEventAndHeat } from '../api/competition.mapper';
import { CompetitionStore } from './competition.store';

@Injectable({ providedIn: 'root' })
export class LiveDataService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly sse = inject(SseService);
  private readonly store = inject(CompetitionStore);

  private sub = new Subscription();

  start(): void {
    this.stop();
    this.store.setMode('live');

    this.api.getCurrentEventAndHeat().subscribe({
      next: (dto) => this.store.setCompetition(mapEventAndHeat(dto)),
      error: (err) => console.warn('Failed to load initial live data', err),
    });

    this.sub.add(
      this.sse.eventAndHeat$().subscribe({
        next: (dto) => this.store.setCompetition(mapEventAndHeat(dto)),
        error: (err) => console.warn('SSE eventAndHeat error', err),
      }),
    );

    this.sub.add(
      this.sse.lapTime$().subscribe({
        next: (dto) => {
          if (dto.lane != null && dto.time != null && dto.rank !== '0') {
            this.store.updateLaneTimes(dto.lane, dto.time, dto.rank ?? null);
          }
        },
        error: (err) => console.warn('SSE lapTime error', err),
      }),
    );
  }

  stop(): void {
    this.sub.unsubscribe();
    this.sub = new Subscription();
    this.store.setMode('config');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
