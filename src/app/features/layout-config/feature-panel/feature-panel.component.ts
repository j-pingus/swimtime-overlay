import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { AnyFeature, ImageFeature, LaneFeature, RectFeature, TextFeature } from '../../../core/models/layout.model';

@Component({
  selector: 'app-feature-panel',
  imports: [FormsModule, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './feature-panel.component.html',
  styleUrl: './feature-panel.component.scss',
})
export class FeaturePanelComponent {
  readonly feature = input<AnyFeature | null>(null);
  readonly features = input<AnyFeature[]>([]);

  readonly featureChange = output<AnyFeature>();
  readonly featureClone = output<AnyFeature>();
  readonly featureRemove = output<string>();
  readonly featureSelect = output<string>();
  readonly featuresReorder = output<AnyFeature[]>();

  protected readonly imageFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'image' ? f : null;
  });

  protected readonly textFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'text' ? f : null;
  });

  protected readonly rectFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'rect' ? f : null;
  });

  protected readonly laneFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'lane' ? f : null;
  });

  patch(partial: Partial<AnyFeature>): void {
    const f = this.feature();
    if (!f) return;
    this.featureChange.emit({ ...f, ...partial } as AnyFeature);
  }

  patchLane(partial: Partial<LaneFeature>): void {
    const f = this.feature();
    if (f?.type !== 'lane') return;
    this.featureChange.emit({ ...f, ...partial } satisfies LaneFeature);
  }

  patchRect(partial: Partial<RectFeature>): void {
    const f = this.feature();
    if (f?.type !== 'rect') return;
    this.featureChange.emit({ ...f, ...partial } satisfies RectFeature);
  }

  patchText(partial: Partial<TextFeature>): void {
    const f = this.feature();
    if (f?.type !== 'text') return;
    this.featureChange.emit({ ...f, ...partial } satisfies TextFeature);
  }

  patchSrc(src: string): void {
    const f = this.feature();
    if (f?.type !== 'image') return;
    this.featureChange.emit({ ...f, src } satisfies ImageFeature);
  }

  clone(): void {
    const f = this.feature();
    if (f) this.featureClone.emit({ ...f, id: crypto.randomUUID() });
  }

  remove(): void {
    const f = this.feature();
    if (f) this.featureRemove.emit(f.id);
  }

  asNumber(value: string): number {
    return Math.max(0, Math.round(parseFloat(value)) || 0);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.patchSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.patchSrc('');
  }

  onDrop(event: CdkDragDrop<AnyFeature[]>): void {
    const reordered = [...this.features()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.featuresReorder.emit(reordered);
  }

  typeLabel(f: AnyFeature): string {
    const map: Record<string, string> = { image: 'IMG', text: 'TXT', rect: 'RCT', lane: 'LAN', generic: 'GEN' };
    return map[f.type] ?? 'GEN';
  }
}
