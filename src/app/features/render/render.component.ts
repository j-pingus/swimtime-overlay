import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  protected readonly features = computed(
    () => this.store.activeLayout()?.features ?? [],
  );

  protected readonly fontFamily = computed(
    () => this.store.activeLayout()?.fontFamily ?? 'sans-serif',
  );

  protected readonly renderBackground = this.store.renderBackground;
}
