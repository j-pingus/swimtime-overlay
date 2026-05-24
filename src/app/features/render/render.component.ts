import { Component, inject, computed } from '@angular/core';
import { LayoutStore } from '../../core/services/layout.store';
import { ZoneComponent } from '../layout-config/zone/zone.component';

@Component({
  selector: 'app-render',
  imports: [ZoneComponent],
  templateUrl: './render.component.html',
  styleUrl: './render.component.scss',
})
export class RenderComponent {
  private readonly store = inject(LayoutStore);

  protected readonly features = computed(
    () => this.store.activeLayout()?.features ?? [],
  );
}
