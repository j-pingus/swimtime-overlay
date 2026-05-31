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

  /** Running counter for auto-generated group labels. */
  private groupCount = 0;

  constructor() {}

  renameLayout(name: string): void {
    const id = this.id();
    if (id && name.trim()) this.store.renameLayout(id, name.trim());
  }

  addFeature(type: FeatureType): void {
    const layoutId = this.id();
    if (!layoutId) return;

    const base = {
      id: crypto.randomUUID(),
      label: `Feature ${this.features().length + 1}`,
      x: 760, y: 440, width: 400, height: 200,
    };

    const feature: AnyFeature =
      type === 'image' ? { ...base, type: 'image', src: '' }
      : type === 'text' ? { ...base, type: 'text', template: 'Text', fontSize: 60, color: '#ffffff', bold: false, italic: false, align: 'left', outlineColor: null, outlineWidth: 2, rotation: 0 }
      : type === 'rect' ? { ...base, type: 'rect', bgColor: '#000000', bgOpacity: 50, border: false, borderColor: '#ffffff', borderWidth: 2, borderRadius: 0, padding: 0 }
      : type === 'lane' ? { ...base, type: 'lane', template: '${swimmerName}', fontSize: 60, color: '#ffffff', bold: false, italic: false, align: 'left', outlineColor: null, outlineWidth: 2, displayDuration: null }
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

  onFeaturesUpdate(features: AnyFeature[]): void {
    const layoutId = this.id();
    if (layoutId) this.store.batchUpdateFeatures(layoutId, features);
  }

  onFeatureClone(feature: AnyFeature): void {
    const layoutId = this.id();
    if (!layoutId) return;
    this.store.addFeature(layoutId, feature);
    this.selectedId.set(feature.id);
  }

  onFeaturesReorder(features: AnyFeature[]): void {
    const layoutId = this.id();
    if (layoutId) this.store.reorderFeatures(layoutId, features);
  }

  onFeatureRemove(featureId: string): void {
    const layoutId = this.id();
    if (layoutId) {
      this.store.removeFeature(layoutId, featureId);
      this.selectedId.set(null);
    }
  }

  onGroupCreate(featureIds: string[]): void {
    const layoutId = this.id();
    if (!layoutId || featureIds.length < 2) return;
    this.groupCount++;
    const groupId = this.store.groupFeatures(layoutId, featureIds, `Group ${this.groupCount}`);
    this.selectedId.set(groupId);
  }

  onUngroupFeature(groupId: string): void {
    const layoutId = this.id();
    if (layoutId) {
      this.store.ungroupFeatures(layoutId, groupId);
      this.selectedId.set(null);
    }
  }
}
