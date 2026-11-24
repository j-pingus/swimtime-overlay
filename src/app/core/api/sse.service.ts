import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.service';
import { EventAndHeatDto, LaptimeDto } from './api.models';

@Injectable({ providedIn: 'root' })
export class SseService implements OnDestroy {
  private readonly base = inject(API_BASE_URL);
  private multiplexedSource: EventSource | null = null;
  private refCount = 0;

  /** Real-time lap time updates pushed by the timing system. */
  lapTime$(): Observable<LaptimeDto> {
    return this.namedEvent<LaptimeDto>('laptime');
  }

  /** Real-time event+heat updates (lane list, stroke, category, etc). */
  eventAndHeat$(): Observable<EventAndHeatDto> {
    return this.namedEvent<EventAndHeatDto>('eventAndHeat');
  }

  private getOrCreateSource(): EventSource {
    if (!this.multiplexedSource || this.multiplexedSource.readyState === EventSource.CLOSED) {
      this.multiplexedSource = new EventSource(`${this.base}/sse/stream`);
    }
    return this.multiplexedSource;
  }

  private namedEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      const es = this.getOrCreateSource();
      this.refCount++;

      const handler = (event: MessageEvent) => {
        try {
          observer.next(JSON.parse(event.data) as T);
        } catch {
          // non-JSON keepalive frames — ignore
        }
      };

      const errorHandler = () => {
        if (es.readyState === EventSource.CLOSED) {
          observer.error(new Error('SSE connection permanently closed'));
        }
        // readyState === CONNECTING: browser is already retrying — do nothing.
      };

      es.addEventListener(eventName, handler);
      es.addEventListener('error', errorHandler);

      return () => {
        es.removeEventListener(eventName, handler);
        es.removeEventListener('error', errorHandler);
        this.refCount--;
        if (this.refCount <= 0) {
          this.multiplexedSource?.close();
          this.multiplexedSource = null;
          this.refCount = 0;
        }
      };
    });
  }

  ngOnDestroy(): void {
    this.multiplexedSource?.close();
    this.multiplexedSource = null;
    this.refCount = 0;
  }
}
