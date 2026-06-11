import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventAndHeatDto } from './api.models';

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
}
