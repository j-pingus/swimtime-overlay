import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ApiService } from '../api/api.service';
import { SseService } from '../api/sse.service';
import { mapEventAndHeat, mapNextHeat } from '../api/competition.mapper';
import { CompetitionStore } from './competition.store';
import { LayoutStore } from './layout.store';

@Injectable({ providedIn: 'root' })
export class LiveDataService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly sse = inject(SseService);
  private readonly competitionStore = inject(CompetitionStore);
  private readonly layoutStore = inject(LayoutStore);

  private sub = new Subscription();
  private ruleTimer: ReturnType<typeof setTimeout> | null = null;

  start(): void {
    this.stop();
    this.competitionStore.setMode('live');

    this.api.getCurrentEventAndHeat().subscribe({
      next: (dto) => this.competitionStore.setCompetition(mapEventAndHeat(dto)),
      error: (err) => console.warn('Failed to load initial live data', err),
    });

    this.sub.add(
      this.sse.eventAndHeat$().subscribe({
        next: (dto) => {
          this.competitionStore.setCompetition(mapEventAndHeat(dto));
          if (dto.swimTimeMessageType === 'START_LIST' && dto.splashHeatId != null) {
            this.api.getNextHeats(dto.splashHeatId).subscribe({
              next: (dtos) => this.competitionStore.setNextHeats(dtos.map(mapNextHeat)),
              error: (err) => console.warn('Failed to load next heats', err),
            });
          }
          if (dto.swimTimeMessageType === 'CHRONO_START') {
            this.competitionStore.setChronoStart(Date.now());
          }
          if (dto.swimTimeMessageType === 'HEAT_ARRIVED') {
            this.competitionStore.setChronoStop();
          }
          if (dto.swimTimeMessageType) {
            this.applyRule(dto.swimTimeMessageType);
          }
        },
        error: (err) => console.warn('SSE eventAndHeat error', err),
      }),
    );

    this.sub.add(
      this.sse.lapTime$().subscribe({
        next: (dto) => {
          if (dto.lane != null && dto.time != null && dto.rank !== '0') {
            this.competitionStore.updateLaneTimes(dto.lane, dto.time, dto.rank ?? null);
          }
        },
        error: (err) => console.warn('SSE lapTime error', err),
      }),
    );
  }

  stop(): void {
    this.clearRuleTimer();
    this.sub.unsubscribe();
    this.sub = new Subscription();
    this.competitionStore.setMode('config');
  }

  ngOnDestroy(): void {
    this.clearRuleTimer();
    this.sub.unsubscribe();
  }

  private applyRule(messageType: string): void {
    const rule = this.layoutStore.getState().messageTypeRules[messageType];
    if (!rule) return;

    this.clearRuleTimer();
    this.layoutStore.setActiveLayout(rule.layoutId);

    if (rule.duration != null) {
      const activatedId = rule.layoutId;
      this.ruleTimer = setTimeout(() => {
        // Only clear if the layout hasn't been changed in the meantime
        if (this.layoutStore.getState().activeLayoutId === activatedId) {
          this.layoutStore.setActiveLayout(null);
        }
        this.ruleTimer = null;
      }, rule.duration * 1000);
    }
  }

  private clearRuleTimer(): void {
    if (this.ruleTimer != null) {
      clearTimeout(this.ruleTimer);
      this.ruleTimer = null;
    }
  }
}
