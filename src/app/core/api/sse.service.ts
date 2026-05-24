import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.service';
import { EventAndHeatDto, LaptimeDto } from './api.models';

@Injectable({ providedIn: 'root' })
export class SseService implements OnDestroy {
  private readonly base = inject(API_BASE_URL);
  private readonly openSources = new Set<EventSource>();

  /** Real-time lap time updates pushed by the timing system. */
  lapTime$(): Observable<LaptimeDto> {
    return this.stream<LaptimeDto>(`${this.base}/api/sse/laptime`);
  }

  /** Real-time event+heat updates (lane list, stroke, category, etc). */
  eventAndHeat$(): Observable<EventAndHeatDto> {
    return this.stream<EventAndHeatDto>(`${this.base}/api/sse/eventAndHeat`);
  }

  private stream<T>(url: string): Observable<T> {
    return new Observable<T>((observer) => {
      const es = new EventSource(url);
      this.openSources.add(es);

      es.onmessage = (event) => {
        try {
          observer.next(JSON.parse(event.data) as T);
        } catch {
          // non-JSON keepalive frames — ignore
        }
      };

      es.onerror = (err) => observer.error(err);

      return () => {
        es.close();
        this.openSources.delete(es);
      };
    });
  }

  ngOnDestroy(): void {
    this.openSources.forEach((es) => es.close());
    this.openSources.clear();
  }
}
