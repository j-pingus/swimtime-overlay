import { Injectable, effect, inject } from '@angular/core';
import { LayoutStore } from './layout.store';
import { RENDER_FONTS } from '../models/layout.model';

@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private readonly store = inject(LayoutStore);

  constructor() {
    // Proactively pre-warm the font cache when the active layout changes.
    effect(() => {
      const fontFamily = this.store.activeLayout()?.fontFamily ?? 'sans-serif';
      void this.loadFont(fontFamily);
    });
  }

  /** Injects the Google Fonts stylesheet (once per font) and resolves when the
   *  font face is confirmed usable by the browser. */
  async loadFont(fontFamily: string): Promise<void> {
    const entry = RENDER_FONTS.find((f) => f.value === fontFamily);
    if (!entry?.googleFont) return;

    const linkId = `render-font-${fontFamily.replace(/\s+/g, '-')}`;
    let link = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${entry.googleFont}&display=swap`;
      document.head.appendChild(link);

      // Wait for the stylesheet to be parsed so @font-face rules are registered.
      await new Promise<void>((resolve) => {
        if ((link as HTMLLinkElement).sheet) { resolve(); return; }
        (link as HTMLLinkElement).addEventListener('load', () => resolve(), { once: true });
        (link as HTMLLinkElement).addEventListener('error', () => resolve(), { once: true });
      });
    }

    try {
      await document.fonts.load(`400 16px "${fontFamily}"`);
    } catch { /* proceed — font may still render fine */ }
  }
}
