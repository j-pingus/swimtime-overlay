import { Injectable, inject, OnDestroy } from '@angular/core';
import { CompetitionStore, CompetitionStoreState } from './competition.store';

const CHANNEL_NAME = 'swimtime_competition_sync';

@Injectable({ providedIn: 'root' })
export class CompetitionSyncService implements OnDestroy {
  private readonly store = inject(CompetitionStore);
  private readonly channel = new BroadcastChannel(CHANNEL_NAME);
  private readonly unsubscribeLocal: () => void;

  constructor() {
    this.channel.onmessage = (event: MessageEvent<CompetitionStoreState>) => {
      this.store.applyRemoteState(event.data);
    };

    this.unsubscribeLocal = this.store.onLocalUpdate((state) => {
      this.channel.postMessage(state);
    });
  }

  ngOnDestroy(): void {
    this.channel.close();
    this.unsubscribeLocal();
  }
}
