import { Injectable, effect, inject } from '@angular/core';
import { LayoutStore } from './layout.store';
import { RENDER_FONTS } from '../models/layout.model';

@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private readonly store = inject(LayoutStore);

  constructor() {
    effect(() => {
      const fontFamily = this.store.activeLayout()?.fontFamily ?? 'sans-serif';
      this.applyFont(fontFamily);
    });
  }

  private applyFont(fontFamily: string): void {
    const entry = RENDER_FONTS.find((f) => f.value === fontFamily);
    const linkId = 'render-font';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!entry?.googleFont) {
      link?.remove();
      return;
    }

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${entry.googleFont}&display=swap`;
  }
}
