import { Component, inject, computed, signal, effect } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LayoutStore } from '../../core/services/layout.store';
import { FontLoaderService } from '../../core/services/font-loader.service';
import { ZoneSurfaceComponent } from '../layout-config/zone/zone-surface.component';

@Component({
  selector: 'app-render',
  imports: [ZoneSurfaceComponent, RouterLink],
  templateUrl: './render.component.html',
  styleUrl: './render.component.scss',
})
export class RenderComponent {
  private readonly store = inject(LayoutStore);
  private readonly fontLoader = inject(FontLoaderService);
  private readonly route = inject(ActivatedRoute);

  private readonly pinnedId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
  );

  private readonly layout = computed(() => {
    const id = this.pinnedId();
    return id
      ? (this.store.layouts().find((l) => l.id === id) ?? null)
      : this.store.activeLayout();
  });

  protected readonly features = computed(() => this.layout()?.features ?? []);
  protected readonly renderBackground = this.store.renderBackground;

  private readonly requestedFont = computed(() => this.layout()?.fontFamily ?? 'sans-serif');
  private readonly _readyFont = signal('sans-serif');
  protected readonly fontFamily = this._readyFont.asReadonly();

  constructor() {
    effect(() => {
      const requested = this.requestedFont();
      void this.fontLoader.loadFont(requested).then(() => {
        if (this.requestedFont() === requested) {
          this._readyFont.set(requested);
        }
      });
    });
  }
}
