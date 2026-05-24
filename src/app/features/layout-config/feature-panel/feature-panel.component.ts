import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnyFeature, ImageFeature } from '../../../core/models/layout.model';

@Component({
  selector: 'app-feature-panel',
  imports: [FormsModule],
  templateUrl: './feature-panel.component.html',
  styleUrl: './feature-panel.component.scss',
})
export class FeaturePanelComponent {
  readonly feature = input<AnyFeature | null>(null);

  readonly featureChange = output<AnyFeature>();
  readonly featureRemove = output<string>();

  protected readonly imageFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'image' ? f : null;
  });

  patch(partial: Partial<AnyFeature>): void {
    const f = this.feature();
    if (!f) return;
    this.featureChange.emit({ ...f, ...partial } as AnyFeature);
  }

  patchSrc(src: string): void {
    const f = this.feature();
    if (f?.type !== 'image') return;
    this.featureChange.emit({ ...f, src } satisfies ImageFeature);
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
}
