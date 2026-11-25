import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompetitionInfoDto, EventAndHeatDto, EventDto } from './api.models';
import { Layout, MessageTypeRules } from '../models/layout.model';

export interface ResourceDto {
  id: string;
  owner: string;
  type: string;
  resource: string;
}

export const RESOURCE_OWNER          = 'swimtime-overlay';
export const RESOURCE_TYPE           = 'layout';
export const ASSOCIATIONS_TYPE        = 'associations';
export const ASSOCIATIONS_RESOURCE_ID = 'message-type-association';

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

  getLayoutResources(): Observable<ResourceDto[]> {
    return this.http.get<ResourceDto[]>(`${this.base}/resources/${RESOURCE_OWNER}/${RESOURCE_TYPE}`);
  }

  getLayoutResource(id: string): Observable<ResourceDto> {
    return this.http.get<ResourceDto>(`${this.base}/resources/id/${id}`);
  }

  publishNewLayoutResource(layout: Layout): Observable<ResourceDto> {
    return this.http.post<ResourceDto>(`${this.base}/resources/id/${layout.id}`, {
      owner: RESOURCE_OWNER,
      type: RESOURCE_TYPE,
      resource: JSON.stringify(layout),
    });
  }

  updateLayoutResource(id: string, layout: Layout): Observable<ResourceDto> {
    return this.http.put<ResourceDto>(
      `${this.base}/resources/id/${id}`,
      JSON.stringify(layout),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  deleteLayoutResource(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/resources/id/${id}`);
  }

  getAssociationsResource(): Observable<ResourceDto> {
    return this.http.get<ResourceDto>(`${this.base}/resources/id/${ASSOCIATIONS_RESOURCE_ID}`);
  }

  publishNewAssociationsResource(rules: MessageTypeRules): Observable<ResourceDto> {
    return this.http.post<ResourceDto>(`${this.base}/resources/id/${ASSOCIATIONS_RESOURCE_ID}`, {
      owner: RESOURCE_OWNER,
      type: ASSOCIATIONS_TYPE,
      resource: JSON.stringify(rules),
    });
  }

  updateAssociationsResource(rules: MessageTypeRules): Observable<ResourceDto> {
    return this.http.put<ResourceDto>(
      `${this.base}/resources/id/${ASSOCIATIONS_RESOURCE_ID}`,
      JSON.stringify(rules),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }
}
