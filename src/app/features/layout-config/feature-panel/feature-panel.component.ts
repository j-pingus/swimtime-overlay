import { Component, computed, inject, input, output, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { AnyFeature, ChronoFeature, ClockFeature, FlagFeature, GroupFeature, ImageFeature, LaneFeature, PolygonFeature, RectFeature, TextFeature } from '../../../core/models/layout.model';
import { FeatureClipboardService } from '../../../core/services/feature-clipboard.service';
import { CompetitionStore } from '../../../core/services/competition.store';
import { findUnresolvedTokens } from '../../../core/utils/template.util';

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
  private readonly clipboard = inject(FeatureClipboardService);
  private readonly competitionStore = inject(CompetitionStore);

  readonly feature = input<AnyFeature | null>(null);
  readonly features = input<AnyFeature[]>([]);
  readonly selectedFeatureId = input<string | null>(null);

  readonly featureChange = output<AnyFeature>();
  readonly featureRemove = output<string>();
  readonly featureSelect = output<string>();
  readonly featuresReorder = output<AnyFeature[]>();
  readonly featuresUpdate = output<AnyFeature[]>();
  readonly featurePaste = output<AnyFeature[]>();
  readonly groupCreate = output<string[]>();
  readonly ungroupFeature = output<string>();
  readonly groupRemoveWithChildren = output<string>();

  protected readonly hasClipboard = this.clipboard.hasContent;
  protected readonly toast = signal<string>('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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

  protected readonly groupAllChildrenRotatable = computed(() => {
    const g = this.groupFeature();
    if (!g) return false;
    const children = this.features().filter(f => f.groupId === g.id);
    return children.length > 0 && children.every(f => this.supportsRotation(f));
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

  protected readonly polygonFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'polygon' ? f : null;
  });

  protected readonly chronoFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'chrono' ? f : null;
  });

  protected readonly clockFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'clock' ? f : null;
  });

  protected readonly flagFeature = computed(() => {
    const f = this.feature();
    return f?.type === 'flag' ? f : null;
  });

  protected readonly textTemplateErrors = computed(() => {
    const txt = this.textFeature();
    if (!txt) return [];
    return findUnresolvedTokens(txt.template, this.competitionStore.competition());
  });

  protected readonly laneTemplateErrors = computed(() => {
    const ln = this.laneFeature();
    if (!ln) return [];
    const lane = this.competitionStore.competition().currentHeat?.lanes?.[0];
    if (!lane) return [];
    return findUnresolvedTokens(ln.template, lane);
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

  protected alignCenterX(): void {
    const checked = this.features().filter(f => this.checkedIds().has(f.id) && !f.groupId);
    if (checked.length < 2) return;
    const avgCx = checked.reduce((sum, f) => sum + f.x + f.width / 2, 0) / checked.length;
    this.featuresUpdate.emit(checked.map(f => ({ ...f, x: Math.round(avgCx - f.width / 2) })));
  }

  protected alignCenterY(): void {
    const checked = this.features().filter(f => this.checkedIds().has(f.id) && !f.groupId);
    if (checked.length < 2) return;
    const avgCy = checked.reduce((sum, f) => sum + f.y + f.height / 2, 0) / checked.length;
    this.featuresUpdate.emit(checked.map(f => ({ ...f, y: Math.round(avgCy - f.height / 2) })));
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

  patchPolygon(partial: Partial<PolygonFeature>): void {
    const f = this.feature();
    if (f?.type !== 'polygon') return;
    this.featureChange.emit({ ...f, ...partial } satisfies PolygonFeature);
  }

  changePointCount(count: number): void {
    const f = this.polygonFeature();
    if (!f) return;
    count = Math.max(3, Math.min(20, count));
    const current = f.points.length;
    if (count === current) return;

    let points = f.points.map(p => ({ ...p }));
    if (count > current) {
      const cx = Math.round(points.reduce((s, p) => s + p.x, 0) / points.length);
      const cy = Math.round(points.reduce((s, p) => s + p.y, 0) / points.length);
      for (let i = current; i < count; i++) points.push({ x: cx, y: cy });
    } else {
      points = points.slice(0, count);
    }
    this.featureChange.emit({ ...f, points });
  }

  patchChrono(partial: Partial<ChronoFeature>): void {
    const f = this.feature();
    if (f?.type !== 'chrono') return;
    this.featureChange.emit({ ...f, ...partial } satisfies ChronoFeature);
  }

  patchFlag(partial: Partial<FlagFeature>): void {
    const f = this.feature();
    if (f?.type !== 'flag') return;
    this.featureChange.emit({ ...f, ...partial } satisfies FlagFeature);
  }

  patchClock(partial: Partial<ClockFeature>): void {
    const f = this.feature();
    if (f?.type !== 'clock') return;
    this.featureChange.emit({ ...f, ...partial } satisfies ClockFeature);
  }

  patchText(partial: Partial<TextFeature>): void {
    const f = this.feature();
    if (f?.type !== 'text') return;
    this.featureChange.emit({ ...f, ...partial } satisfies TextFeature);
  }

  appendTextToken(token: string): void {
    const f = this.textFeature();
    if (!f) return;
    this.patchText({ template: f.template + '${' + token + '}' });
  }

  appendLaneToken(token: string): void {
    const f = this.laneFeature();
    if (!f) return;
    this.patchLane({ template: f.template + '${' + token + '}' });
  }

  patchSrc(src: string): void {
    const f = this.feature();
    if (f?.type !== 'image') return;
    this.featureChange.emit({ ...f, src } satisfies ImageFeature);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!event.metaKey && !event.ctrlKey) return;

    if (event.key === 'c') {
      event.preventDefault();
      this.copy();
    } else if (event.key === 'v') {
      event.preventDefault();
      this.paste();
    }
  }

  private showToast(msg: string): void {
    if (this.toastTimer !== null) clearTimeout(this.toastTimer);
    this.toast.set('');
    // Force a new animation cycle by resetting to empty first (microtask gap).
    queueMicrotask(() => {
      this.toast.set(msg);
      this.toastTimer = setTimeout(() => { this.toast.set(''); this.toastTimer = null; }, 2000);
    });
  }

  copy(): void {
    const f = this.feature();
    if (!f) return;
    if (f.type === 'group') {
      const children = this.features().filter((c) => c.groupId === f.id);
      this.clipboard.copy([f, ...children]);
    } else {
      this.clipboard.copy([{ ...f, groupId: undefined }]);
    }
    this.showToast('Copied!');
  }

  paste(): void {
    const pasted = this.clipboard.paste();
    if (pasted) {
      this.featurePaste.emit(pasted);
      this.showToast('Pasted!');
    }
  }

  remove(): void {
    const f = this.feature();
    if (f) this.featureRemove.emit(f.id);
  }

  removeWithChildren(): void {
    const f = this.feature();
    if (f?.type === 'group') this.groupRemoveWithChildren.emit(f.id);
  }

  asNumber(value: string): number {
    return Math.max(0, Math.round(parseFloat(value)) || 0);
  }

  asRotation(value: string): number {
    return Math.round(parseFloat(value)) || 0;
  }

  private supportsRotation(f: AnyFeature): boolean {
    return f.type === 'text' || f.type === 'image' || f.type === 'rect' || f.type === 'chrono';
  }

  applyGroupRotation(newAngle: number): void {
    const g = this.groupFeature();
    if (!g) return;
    const children = this.features().filter(f => f.groupId === g.id);
    if (children.length === 0) return;

    const delta = newAngle - (g.rotation ?? 0);
    if (delta === 0) return;

    const deltaRad = (delta * Math.PI) / 180;
    const cos = Math.cos(deltaRad);
    const sin = Math.sin(deltaRad);

    const minX = Math.min(...children.map(f => f.x));
    const minY = Math.min(...children.map(f => f.y));
    const maxX = Math.max(...children.map(f => f.x + f.width));
    const maxY = Math.max(...children.map(f => f.y + f.height));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const updatedChildren = children.map((f): AnyFeature => {
      const fcx = f.x + f.width / 2;
      const fcy = f.y + f.height / 2;
      const dx = fcx - cx;
      const dy = fcy - cy;
      const newFcx = cx + dx * cos - dy * sin;
      const newFcy = cy + dx * sin + dy * cos;
      const newX = Math.round(newFcx - f.width / 2);
      const newY = Math.round(newFcy - f.height / 2);
      const currentRot = (f as { rotation?: number }).rotation ?? 0;
      return { ...f, x: newX, y: newY, rotation: Math.round(currentRot + delta) } as AnyFeature;
    });

    const updatedGroup: AnyFeature = { ...g, rotation: newAngle };
    this.featuresUpdate.emit([updatedGroup, ...updatedChildren]);
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
      image: 'IMG', text: 'TXT', rect: 'RCT', lane: 'LAN', flag: 'FLG', generic: 'GEN', group: 'GRP', polygon: 'PLY', chrono: 'CHR', clock: 'CLK',
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
