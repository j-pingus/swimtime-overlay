import { Component, inject, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LayoutStore } from '../../core/services/layout.store';
import { AnyFeature, FeatureType } from '../../core/models/layout.model';
import { ZoneComponent } from './zone/zone.component';
import { FeaturePanelComponent } from './feature-panel/feature-panel.component';

@Component({
  selector: 'app-layout-config',
  imports: [RouterLink, ZoneComponent, FeaturePanelComponent],
  templateUrl: './layout-config.component.html',
  styleUrl: './layout-config.component.scss',
})
export class LayoutConfigComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(LayoutStore);

  private readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
  );

  protected readonly layout = computed(() => {
    const id = this.id();
    return id ? this.store.layouts().find((l) => l.id === id) ?? null : null;
  });

  protected readonly features = computed(() => this.layout()?.features ?? []);

  protected readonly selectedId = signal<string | null>(null);
  protected readonly showAddMenu = signal(false);

  protected readonly selectedFeature = computed(() => {
    const id = this.selectedId();
    return id ? this.features().find((f) => f.id === id) ?? null : null;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.store.setActiveLayout(id);
  }

  addFeature(type: FeatureType): void {
    const layoutId = this.id();
    if (!layoutId) return;

    const base = {
      id: crypto.randomUUID(),
      label: `Feature ${this.features().length + 1}`,
      x: 760, y: 440, width: 400, height: 200,
    };

    const feature: AnyFeature = type === 'image'
      ? { ...base, type: 'image', src: '' }
      : { ...base, type: 'generic' };

    this.store.addFeature(layoutId, feature);
    this.selectedId.set(feature.id);
    this.showAddMenu.set(false);
  }

  onFeatureSelect(id: string | null): void {
    this.selectedId.set(id);
  }

  onFeatureUpdate(feature: AnyFeature): void {
    const layoutId = this.id();
    if (layoutId) this.store.updateFeature(layoutId, feature);
  }

  onFeatureRemove(featureId: string): void {
    const layoutId = this.id();
    if (layoutId) {
      this.store.removeFeature(layoutId, featureId);
      this.selectedId.set(null);
    }
  }
}
