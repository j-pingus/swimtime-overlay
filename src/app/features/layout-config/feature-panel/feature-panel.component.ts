import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseFeature } from '../../../core/models/layout.model';

@Component({
  selector: 'app-feature-panel',
  imports: [FormsModule],
  templateUrl: './feature-panel.component.html',
  styleUrl: './feature-panel.component.scss',
})
export class FeaturePanelComponent {
  readonly feature = input<BaseFeature | null>(null);

  readonly featureChange = output<BaseFeature>();
  readonly featureRemove = output<string>();

  patch(partial: Partial<BaseFeature>): void {
    const f = this.feature();
    if (!f) return;
    this.featureChange.emit({ ...f, ...partial });
  }

  remove(): void {
    const f = this.feature();
    if (f) this.featureRemove.emit(f.id);
  }

  asNumber(value: string): number {
    return Math.max(0, parseInt(value, 10) || 0);
  }
}
