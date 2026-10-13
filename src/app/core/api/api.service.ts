import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompetitionInfoDto, EventAndHeatDto, EventDto } from './api.models';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '/api',
});

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  getCurrentEventAndHeat(): Observable<EventAndHeatDto> {
    return this.http.get<EventAndHeatDto>(`${this.base}/sse/eventAndHeat/current`);
  }

  getNextHeats(splashHeatId: number, n = 3): Observable<EventAndHeatDto[]> {
    return this.http.get<EventAndHeatDto[]>(`${this.base}/planning/next/${splashHeatId}`, { params: { n } });
  }

  getCompetitionInfo(): Observable<CompetitionInfoDto> {
    return this.http.get<CompetitionInfoDto>(`${this.base}/planning/competitionInfo`);
  }

  getSessionEvents(sessionNumber: number): Observable<EventDto[]> {
    return this.http.get<EventDto[]>(`${this.base}/planning/session/${sessionNumber}/events`);
  }

  getSessionHeats(sessionNumber: number): Observable<EventAndHeatDto[]> {
    return this.http.get<EventAndHeatDto[]>(`${this.base}/planning/session/${sessionNumber}/heats`);
  }

  sendStartList(eventNumber: string, heatNumber: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/ste/startlist`, { params: { eventNumber, heatNumber } });
  }

  sendStart(eventNumber: string, heatNumber: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/ste/start`, { params: { eventNumber, heatNumber } });
  }
}
