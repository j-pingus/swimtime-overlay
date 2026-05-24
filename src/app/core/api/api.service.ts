import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CompetitionInfoDto,
  CurrentEventDto,
  CurrentHeatDto,
  DummyOfficialsDto,
  EventAndHeatDto,
  EventResponseDto,
  LaptimeDto,
  OfficialsDto,
  PoolSizeDto,
  StatusDto,
  StreamDeckInfoDto,
  SwimmersDto,
  UpdateCompetitionDto,
} from './api.models';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => 'http://localhost:8080',
});

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // --- Competition ---

  getCompetitionInfo(): Observable<CompetitionInfoDto> {
    return this.http.get<CompetitionInfoDto>(`${this.base}/api/competitionInfo`);
  }

  getPoolSize(): Observable<PoolSizeDto> {
    return this.http.get<PoolSizeDto>(`${this.base}/api/currentSession/pool-size`);
  }

  // --- Current event / heat ---

  getCurrentEvent(): Observable<CurrentEventDto> {
    return this.http.get<CurrentEventDto>(`${this.base}/api/currentEvent`);
  }

  getCurrentEventNumber(): Observable<string> {
    return this.http.get<string>(`${this.base}/api/currentEventNumber`);
  }

  getCurrentHeat(): Observable<CurrentHeatDto> {
    return this.http.get<CurrentHeatDto>(`${this.base}/api/currentHeat`);
  }

  getCurrentHeatNumber(): Observable<string> {
    return this.http.get<string>(`${this.base}/api/currentHeatNumber`);
  }

  toggleManualOngoing(): Observable<StatusDto> {
    return this.http.get<StatusDto>(`${this.base}/api/currentHeat/manualOngoing`);
  }

  // --- SSE snapshot endpoints ---

  getLastLapTime(): Observable<LaptimeDto> {
    return this.http.get<LaptimeDto>(`${this.base}/api/sse/lapTime/last`);
  }

  getCurrentEventAndHeat(): Observable<EventAndHeatDto> {
    return this.http.get<EventAndHeatDto>(`${this.base}/api/sse/eventAndHeat/current`);
  }

  // --- Events ---

  getEvent(eventNumber: string): Observable<EventResponseDto> {
    return this.http.get<EventResponseDto>(`${this.base}/api/event/${eventNumber}`);
  }

  startEvent(eventNumber: number, heatNumber: number): Observable<StatusDto> {
    return this.http.get<StatusDto>(`${this.base}/api/start/${eventNumber}/${heatNumber}`);
  }

  // --- Swimmers & officials ---

  getSwimmers(): Observable<SwimmersDto> {
    return this.http.get<SwimmersDto>(`${this.base}/api/swimmers`);
  }

  getOfficials(sessionNumber: number): Observable<OfficialsDto> {
    return this.http.get<OfficialsDto>(`${this.base}/api/officials/${sessionNumber}`);
  }

  // --- Status & control ---

  getStatus(): Observable<StatusDto> {
    return this.http.get<StatusDto>(`${this.base}/api/status`);
  }

  getStreamDeckInfos(): Observable<StreamDeckInfoDto> {
    return this.http.get<StreamDeckInfoDto>(`${this.base}/api/StreamDeckInfos`);
  }

  // --- Commands (POST) ---

  startCommand(eventNumber: string, heatNumber: string): Observable<StatusDto> {
    return this.http.post<StatusDto>(
      `${this.base}/api/start_command/${eventNumber}/${heatNumber}`,
      null,
    );
  }

  resultsSummaryCommand(eventNumber: string): Observable<StatusDto> {
    return this.http.post<StatusDto>(
      `${this.base}/api/results_summary_command/${eventNumber}`,
      null,
    );
  }

  medalCeremonyCommand(eventNumber: string): Observable<StatusDto> {
    return this.http.post<StatusDto>(
      `${this.base}/api/medal_ceremony_command/${eventNumber}`,
      null,
    );
  }

  updateCompetition(): Observable<UpdateCompetitionDto> {
    return this.http.post<UpdateCompetitionDto>(`${this.base}/api/update_competition`, null);
  }

  resetDummyOfficials(): Observable<DummyOfficialsDto> {
    return this.http.post<DummyOfficialsDto>(`${this.base}/api/reset_dummy_officials`, null);
  }

  vjCommand(): Observable<StatusDto> {
    return this.http.post<StatusDto>(`${this.base}/api/vj_command`, null);
  }

  postUpdate(): Observable<void> {
    return this.http.post<void>(`${this.base}/api/update`, null);
  }

  // --- Sport-in-the-box ---

  sitbStatus(): Observable<boolean> {
    return this.http.get<boolean>(`${this.base}/api/sitb/up`);
  }

  sitbStart(): Observable<void> {
    return this.http.put<void>(`${this.base}/api/sitb/start`, null);
  }

  sitbStop(): Observable<void> {
    return this.http.put<void>(`${this.base}/api/sitb/stop`, null);
  }
}
