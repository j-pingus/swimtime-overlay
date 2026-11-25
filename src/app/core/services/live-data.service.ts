import { Injectable, inject, OnDestroy, signal, computed } from '@angular/core';
import { EMPTY, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService, RESOURCE_OWNER, RESOURCE_TYPE, ASSOCIATIONS_TYPE } from '../api/api.service';
import { SseService } from '../api/sse.service';
import { mapEventAndHeat, mapNextHeat } from '../api/competition.mapper';
import { CompetitionStore } from './competition.store';
import { LayoutStore } from './layout.store';
import { Layout } from '../models/layout.model';

@Injectable({ providedIn: 'root' })
export class LiveDataService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly sse = inject(SseService);
  private readonly competitionStore = inject(CompetitionStore);
  private readonly layoutStore = inject(LayoutStore);

  private sub = new Subscription();
  private pendingTimers: ReturnType<typeof setTimeout>[] = [];

  private readonly _eventAndHeatOk = signal(true);
  private readonly _lapTimeOk = signal(true);

  readonly sseEventAndHeatOk = computed(() => this._eventAndHeatOk());
  readonly sseLapTimeOk = computed(() => this._lapTimeOk());

  start(): void {
    this.stop();
    this._eventAndHeatOk.set(true);
    this._lapTimeOk.set(true);
    this.competitionStore.setMode('live');

    this.api.getCurrentEventAndHeat().subscribe({
      next: (dto) => this.competitionStore.setCompetition(mapEventAndHeat(dto)),
      error: (err) => console.warn('Failed to load initial live data', err),
    });

    this.sub.add(
      this.sse.eventAndHeat$().subscribe({
        next: (dto) => {
          if (dto.swimTimeMessageType !== 'HEAT_ARRIVED' && dto.swimTimeMessageType !== 'HEAT_OFFICIAL') {
            this.competitionStore.setCompetition(mapEventAndHeat(dto));
          }
          if (dto.swimTimeMessageType === 'HEAT_OFFICIAL' && dto.lanes?.length) {
            this.competitionStore.updateOfficialResults(
              dto.lanes.map((l, i) => ({
                laneId: l.laneId ?? i + 1,
                officialTime: l.officialTime ?? null,
                rank: l.rank ?? null,
              })),
            );
          }
          if (dto.swimTimeMessageType === 'START_LIST') {
            this.competitionStore.resetChrono();
          }
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
        error: (err) => { console.warn('SSE eventAndHeat error', err); this._eventAndHeatOk.set(false); },
      }),
    );

    this.sub.add(
      this.sse.lapTime$().subscribe({
        next: (dto) => {
          if (dto.lane != null && dto.time != null && dto.rank !== '0') {
            const distance = dto.distance != null ? String(dto.distance) : null;
            this.competitionStore.updateLaneTimes(dto.lane, dto.time, dto.rank ?? null, distance);
          }
          if (dto.time != null) {
            const elapsedMs = parseTimeToMs(dto.time);
            if (elapsedMs != null) this.competitionStore.syncChrono(elapsedMs);
          }
        },
        error: (err) => { console.warn('SSE lapTime error', err); this._lapTimeOk.set(false); },
      }),
    );

    this.sub.add(
      this.sse.resource$().subscribe({
        next: (evt) => {
          if (evt.owner !== RESOURCE_OWNER) return;

          if (evt.type === RESOURCE_TYPE) {
            this.api.getLayoutResource(evt.id).pipe(
              catchError((err: HttpErrorResponse) => {
                if (err.status === 404) this.layoutStore.markUnpublished(evt.id);
                return EMPTY;
              }),
            ).subscribe((dto) => {
              try {
                const layout = JSON.parse(dto.resource) as Layout;
                this.layoutStore.mergeServerLayouts([layout]);
              } catch {
                console.warn('[LiveData] could not parse resource layout', dto.id);
              }
            });
          } else if (evt.type === ASSOCIATIONS_TYPE) {
            this.api.getAssociationsResource().pipe(
              catchError((err: HttpErrorResponse) => {
                if (err.status === 404) this.layoutStore.markAssociationsSaved(false);
                return EMPTY;
              }),
            ).subscribe((dto) => {
              try {
                this.layoutStore.applyServerAssociations(JSON.parse(dto.resource));
              } catch {
                console.warn('[LiveData] could not parse associations resource');
              }
            });
          }
        },
        error: (err) => console.warn('SSE resource error', err),
      }),
    );
  }

  stop(): void {
    this.clearPendingTimers();
    this.sub.unsubscribe();
    this.sub = new Subscription();
    this.competitionStore.setMode('config');
  }

  ngOnDestroy(): void {
    this.clearPendingTimers();
    this.sub.unsubscribe();
  }

  private applyRule(messageType: string): void {
    const rules = this.layoutStore.getState().messageTypeRules.filter((r) => r.messageType === messageType);
    if (!rules.length) return;

    this.clearPendingTimers();

    for (const rule of rules) {
      const activate = () => {
        this.layoutStore.setActiveLayout(rule.layoutId);
        if (rule.duration != null) {
          const activatedId = rule.layoutId;
          const t = setTimeout(() => {
            if (this.layoutStore.getState().activeLayoutId === activatedId) {
              this.layoutStore.setActiveLayout(null);
            }
            this.pendingTimers = this.pendingTimers.filter((x) => x !== t);
          }, rule.duration * 1000);
          this.pendingTimers.push(t);
        }
      };

      if (rule.delay != null && rule.delay > 0) {
        const t = setTimeout(() => {
          this.pendingTimers = this.pendingTimers.filter((x) => x !== t);
          activate();
        }, rule.delay * 1000);
        this.pendingTimers.push(t);
      } else {
        activate();
      }
    }
  }

  private clearPendingTimers(): void {
    for (const t of this.pendingTimers) clearTimeout(t);
    this.pendingTimers = [];
  }
}

/** Parse lap time string to milliseconds. Handles "ss.hh", "m:ss.hh", "m:ss", "ss". */
function parseTimeToMs(time: string): number | null {
  const withMinutes = time.match(/^(\d+):(\d{2})(?:\.(\d+))?$/);
  if (withMinutes) {
    const minutes = parseInt(withMinutes[1], 10);
    const seconds = parseInt(withMinutes[2], 10);
    const fracStr = (withMinutes[3] ?? '').padEnd(3, '0').slice(0, 3);
    return (minutes * 60 + seconds) * 1000 + parseInt(fracStr, 10);
  }
  const secondsOnly = time.match(/^(\d+)(?:\.(\d+))?$/);
  if (secondsOnly) {
    const seconds = parseInt(secondsOnly[1], 10);
    const fracStr = (secondsOnly[2] ?? '').padEnd(3, '0').slice(0, 3);
    return seconds * 1000 + parseInt(fracStr, 10);
  }
  return null;
}
