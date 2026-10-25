import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LayoutStore } from '../../core/services/layout.store';
import { ZoneSurfaceComponent } from '../layout-config/zone/zone-surface.component';

@Component({
  selector: 'app-render',
  imports: [ZoneSurfaceComponent, RouterLink],
  templateUrl: './render.component.html',
  styleUrl: './render.component.scss',
})
export class RenderComponent {
  private readonly store = inject(LayoutStore);
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
  protected readonly fontFamily = computed(() => this.layout()?.fontFamily ?? 'sans-serif');
  protected readonly renderBackground = this.store.renderBackground;
}
