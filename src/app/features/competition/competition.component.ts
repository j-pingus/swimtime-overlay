import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { CompetitionInfoDto, EventAndHeatDto } from '../../core/api/api.models';
import { forkJoin } from 'rxjs';

interface HeatGroup {
  eventNumber: string;
  label: string;
  heats: EventAndHeatDto[];
}

interface SessionData {
  number: number;
  name: string;
  date: string;
  eventGroups: HeatGroup[];
}

interface ActionRecord {
  state: 'pending' | 'ok' | 'error';
  time?: string;
}

@Component({
  selector: 'app-competition',
  imports: [RouterLink],
  templateUrl: './competition.component.html',
  styleUrl: './competition.component.scss',
})
export class CompetitionComponent implements OnInit {
  private readonly api = inject(ApiService);

  protected competitionInfo = signal<CompetitionInfoDto | null>(null);
  protected sessions = signal<SessionData[]>([]);
  protected collapsedSessions = signal<Set<number>>(new Set());
  protected loading = signal(true);
  protected error = signal<string | null>(null);
  protected actionStates = signal<Map<string, ActionRecord>>(new Map());

  ngOnInit(): void {
    this.api.getCompetitionInfo().subscribe({
      next: (info) => {
        this.competitionInfo.set(info);
        if (!info.sessions?.length) {
          this.loading.set(false);
          return;
        }
        const requests = info.sessions.map((s) => this.api.getSessionHeats(s.number));
        forkJoin(requests).subscribe({
          next: (results) => {
            const sessionData: SessionData[] = info.sessions.map((s, i) => ({
              number: s.number,
              name: s.name,
              date: s.date,
              eventGroups: this.groupByEvent(results[i]),
            }));
            this.sessions.set(sessionData);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('Failed to load session heats.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('Failed to load competition info.');
        this.loading.set(false);
      },
    });
  }

  private groupByEvent(heats: EventAndHeatDto[]): HeatGroup[] {
    const map = new Map<string, EventAndHeatDto[]>();
    for (const h of heats) {
      const key = h.event ?? '?';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return Array.from(map.entries()).map(([eventNumber, eventHeats]) => {
      const first = eventHeats[0];
      const label = [first.distance, first.stroke, first.category]
        .filter(Boolean)
        .join(' · ');
      return { eventNumber, label, heats: eventHeats };
    });
  }

  protected toggleSession(sessionNumber: number): void {
    const current = new Set(this.collapsedSessions());
    if (current.has(sessionNumber)) {
      current.delete(sessionNumber);
    } else {
      current.add(sessionNumber);
    }
    this.collapsedSessions.set(current);
  }

  protected isCollapsed(sessionNumber: number): boolean {
    return this.collapsedSessions().has(sessionNumber);
  }

  protected heatKey(eventNumber: string, heatNumber: string, action: string): string {
    return `${eventNumber}-${heatNumber}-${action}`;
  }

  protected actionRecord(eventNumber: string, heatNumber: string, action: string): ActionRecord | null {
    return this.actionStates().get(this.heatKey(eventNumber, heatNumber, action)) ?? null;
  }

  protected sendStartList(eventNumber: string, heatNumber: string): void {
    this.triggerAction(eventNumber, heatNumber, 'sl', () =>
      this.api.sendStartList(eventNumber, heatNumber),
    );
  }

  protected sendStart(eventNumber: string, heatNumber: string): void {
    this.triggerAction(eventNumber, heatNumber, 'st', () =>
      this.api.sendStart(eventNumber, heatNumber),
    );
  }

  private triggerAction(
    eventNumber: string,
    heatNumber: string,
    action: string,
    call: () => ReturnType<ApiService['sendStart']>,
  ): void {
    const key = this.heatKey(eventNumber, heatNumber, action);
    const map = new Map(this.actionStates());
    map.set(key, { state: 'pending' });
    this.actionStates.set(map);

    call().subscribe({
      next: () => this.setActionDone(key, 'ok'),
      error: () => this.setActionDone(key, 'error'),
    });
  }

  private setActionDone(key: string, state: 'ok' | 'error'): void {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const map = new Map(this.actionStates());
    map.set(key, { state, time });
    this.actionStates.set(map);
  }
}
