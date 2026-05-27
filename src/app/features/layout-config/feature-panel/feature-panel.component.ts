import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { AnyFeature, GroupFeature, ImageFeature, LaneFeature, RectFeature, TextFeature } from '../../../core/models/layout.model';

interface ListEntry {
  feature: AnyFeature;
  isGroupHeader: boolean;
  isGroupChild: boolean;
}

@Component({
  selector: 'app-feature-panel',
  imports: [FormsModule, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './feature-panel.component.html',
  styleUrl: './feature-panel.component.scss',
})
export class FeaturePanelComponent {
  readonly feature = input<AnyFeature | null>(null);
  readonly features = input<AnyFeature[]>([]);
  readonly selectedFeatureId = input<string | null>(null);

  readonly featureChange = output<AnyFeature>();
  readonly featureClone = output<AnyFeature>();
  readonly featureRemove = output<string>();
  readonly featureSelect = output<string>();
  readonly featuresReorder = output<AnyFeature[]>();
  readonly groupCreate = output<string[]>();
  readonly ungroupFeature = output<string>();

  /** Ids of features checked for grouping — cleared on group creation. */
  private readonly checkedIds = signal<Set<string>>(new Set());

  /** Normalized list: group header immediately followed by its children. */
  protected readonly displayList = computed((): ListEntry[] => {
    const features = this.features();
    const result: ListEntry[] = [];
    const visited = new Set<string>();

    for (const f of features) {
      if (visited.has(f.id)) continue;
      visited.add(f.id);

      if (f.type === 'group') {
        result.push({ feature: f, isGroupHeader: true, isGroupChild: false });
        // Add children immediately after, in their original array order.
        for (const child of features) {
          if (child.groupId === f.id && !visited.has(child.id)) {
            result.push({ feature: child, isGroupHeader: false, isGroupChild: true });
            visited.add(child.id);
          }
        }
      } else if (!f.groupId) {
        result.push({ feature: f, isGroupHeader: false, isGroupChild: false });
      }
    }

    // Safety net: orphaned children (group header deleted without store cleanup).
    for (const f of features) {
      if (!visited.has(f.id)) {
        result.push({ feature: f, isGroupHeader: false, isGroupChild: !!f.groupId });
      }
    }

    return result;
  });

  protected readonly groupFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'group' ? f : null;
  });

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

  protected readonly canGroup = computed(() => {
    const ids = this.checkedIds();
    return ids.size >= 2;
  });

  protected isChecked(id: string): boolean {
    return this.checkedIds().has(id);
  }

  protected toggleCheck(id: string, event: Event): void {
    event.stopPropagation();
    const next = new Set(this.checkedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.checkedIds.set(next);
  }

  protected createGroup(): void {
    const ids = [...this.checkedIds()];
    if (ids.length < 2) return;
    this.checkedIds.set(new Set());
    this.groupCreate.emit(ids);
  }

  protected ungroup(groupId: string): void {
    this.ungroupFeature.emit(groupId);
  }

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
    if (f && f.type !== 'group') this.featureClone.emit({ ...f, id: crypto.randomUUID(), groupId: undefined });
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

  onDrop(event: CdkDragDrop<ListEntry[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const list = this.displayList();
    const dragged = list[event.previousIndex];

    if (dragged.isGroupChild) return; // Children are not individually reorderable.

    if (dragged.isGroupHeader) {
      const groupId = dragged.feature.id;
      // Determine block size: header + consecutive children in displayList.
      let blockSize = 1;
      for (let i = event.previousIndex + 1; i < list.length; i++) {
        if (list[i].feature.groupId === groupId) blockSize++;
        else break;
      }

      const prevIdx = event.previousIndex;
      const currIdx = event.currentIndex;

      // Drop within own block: no-op.
      if (currIdx > prevIdx && currIdx < prevIdx + blockSize) return;

      const block = list.slice(prevIdx, prevIdx + blockSize).map((e) => e.feature);
      const rest = [
        ...list.slice(0, prevIdx),
        ...list.slice(prevIdx + blockSize),
      ].map((e) => e.feature);

      const insertAt = Math.max(0, Math.min(
        currIdx > prevIdx ? currIdx - blockSize + 1 : currIdx,
        rest.length,
      ));
      rest.splice(insertAt, 0, ...block);
      this.featuresReorder.emit(rest);
    } else {
      // Standalone feature.
      const reordered = list.map((e) => e.feature);
      moveItemInArray(reordered, event.previousIndex, event.currentIndex);
      this.featuresReorder.emit(reordered);
    }
  }

  typeLabel(f: AnyFeature): string {
    const map: Record<string, string> = {
      image: 'IMG', text: 'TXT', rect: 'RCT', lane: 'LAN', generic: 'GEN', group: 'GRP',
    };
    return map[f.type] ?? 'GEN';
  }

  isSelected(f: AnyFeature): boolean {
    const sel = this.selectedFeatureId();
    return f.id === sel || (!!f.groupId && f.groupId === sel);
  }

  asGroup(f: AnyFeature): GroupFeature | null {
    return f.type === 'group' ? f : null;
  }
}
