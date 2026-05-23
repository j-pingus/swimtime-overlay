import { Injectable, inject, OnDestroy, effect } from '@angular/core';
import { LayoutStore, LayoutStoreState } from './layout.store';

const CHANNEL_NAME = 'swimtime_layout_sync';

@Injectable({ providedIn: 'root' })
export class LayoutSyncService implements OnDestroy {
  private readonly store = inject(LayoutStore);
  private readonly channel = new BroadcastChannel(CHANNEL_NAME);
  private broadcasting = false;

  constructor() {
    this.channel.onmessage = (event: MessageEvent<LayoutStoreState>) => {
      this.broadcasting = true;
      this.store.applyRemoteState(event.data);
      this.broadcasting = false;
    };

    // Broadcast every state change to other windows
    effect(() => {
      const state = this.store.getState();
      if (!this.broadcasting) {
        this.channel.postMessage(state);
      }
    });
  }

  ngOnDestroy(): void {
    this.channel.close();
  }
}
