import { Injectable, inject, OnDestroy } from '@angular/core';
import { LayoutStore, LayoutStoreState } from './layout.store';

const CHANNEL_NAME = 'swimtime_layout_sync';

@Injectable({ providedIn: 'root' })
export class LayoutSyncService implements OnDestroy {
  private readonly store = inject(LayoutStore);
  private readonly channel = new BroadcastChannel(CHANNEL_NAME);
  private readonly unsubscribeLocal: () => void;

  constructor() {
    // Receive state pushed by other windows and apply it locally (no re-broadcast).
    this.channel.onmessage = (event: MessageEvent<LayoutStoreState>) => {
      this.store.applyRemoteState(event.data);
    };

    // Broadcast every LOCAL mutation synchronously — applyRemoteState never calls this.
    this.unsubscribeLocal = this.store.onLocalUpdate((state) => {
      this.channel.postMessage(state);
    });
  }

  ngOnDestroy(): void {
    this.channel.close();
    this.unsubscribeLocal();
  }
}
