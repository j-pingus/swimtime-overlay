import {
  Component, inject, input, output, computed, signal,
  viewChild, ElementRef, HostListener, DestroyRef,
} from '@angular/core';
import { AnyFeature, BaseFeature, GroupFeature, ImageFeature, LaneFeature, RectFeature, TextFeature, TextAlign } from '../../../core/models/layout.model';
import { CompetitionStore } from '../../../core/services/competition.store';
import { resolveTemplate } from '../../../core/utils/template.util';

export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

type DragMode = 'move' | 'resize';

interface GroupChild {
  id: string;
  origX: number;
  origY: number;
  width: number;
  height: number;
}

interface DragState {
  featureId: string;
  mode: DragMode;
  /** SVG coords where the drag started — never mutated. */
  startX: number;
  startY: number;
  /** Feature (or group bounding box) geometry when the drag started — never mutated. */
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  /** Current SVG mouse position — updated every mousemove. */
  currentX: number;
  currentY: number;
  /** Set when dragging a group — original positions of all children. */
  groupChildren?: GroupChild[];
}

export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-zone',
  templateUrl: './zone.component.html',
  styleUrl: './zone.component.scss',
})
export class ZoneComponent {
  private readonly competitionStore = inject(CompetitionStore);
  private readonly now = signal(Date.now());

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  readonly features = input<BaseFeature[]>([]);
  readonly selectedFeatureId = input<string | null>(null);
  /** When false the zone is display-only: no anchors, no canvas hint, no interaction. */
  readonly interactive = input<boolean>(true);

  readonly featureSelect = output<string | null>();
  readonly featureUpdate = output<BaseFeature>();
  /** Emitted instead of featureUpdate when a group move affects multiple features. */
  readonly featuresUpdate = output<AnyFeature[]>();

  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgEl');
  private readonly drag = signal<DragState | null>(null);

  /** Merges drag-preview geometry into the feature list for live feedback. */
  protected readonly displayFeatures = computed(() => {
    const d = this.drag();
    if (!d) return this.features();

    const rawDx = d.currentX - d.startX;
    const rawDy = d.currentY - d.startY;

    if (d.groupChildren) {
      // Constrain delta by the group's bounding box so no child escapes the canvas.
      const clampedX = clamp(d.origX + rawDx, 0, CANVAS_W - d.origW);
      const clampedY = clamp(d.origY + rawDy, 0, CANVAS_H - d.origH);
      const dx = clampedX - d.origX;
      const dy = clampedY - d.origY;
      const childMap = new Map(d.groupChildren.map((c) => [c.id, c]));
      return this.features().map((f) => {
        const orig = childMap.get(f.id);
        if (!orig) return f;
        return { ...f, x: orig.origX + dx, y: orig.origY + dy };
      });
    }

    return this.features().map((f) => {
      if (!d || f.id !== d.featureId) return f;
      const dx = rawDx;
      const dy = rawDy;
      return d.mode === 'move'
        ? { ...f, x: clamp(d.origX + dx, 0, CANVAS_W - f.width), y: clamp(d.origY + dy, 0, CANVAS_H - f.height) }
        : { ...f, width: clamp(d.origW + dx, 40, CANVAS_W - d.origX), height: clamp(d.origH + dy, 20, CANVAS_H - d.origY) };
    });
  });

  /** Bounding boxes for all groups, derived from their children's current positions. */
  protected readonly groupBoundsMap = computed(() => {
    const map = new Map<string, GroupBounds>();
    for (const f of this.displayFeatures()) {
      if (f.type === 'group' || !f.groupId) continue;
      const cur = map.get(f.groupId);
      if (!cur) {
        map.set(f.groupId, { x: f.x, y: f.y, width: f.width, height: f.height });
      } else {
        const x2 = Math.max(cur.x + cur.width, f.x + f.width);
        const y2 = Math.max(cur.y + cur.height, f.y + f.height);
        const x = Math.min(cur.x, f.x);
        const y = Math.min(cur.y, f.y);
        map.set(f.groupId, { x, y, width: x2 - x, height: y2 - y });
      }
    }
    return map;
  });

  protected readonly ANCHOR = 16;
  protected readonly GROUP_PAD = 8;

  protected asGroup(f: AnyFeature): GroupFeature | null {
    return f.type === 'group' ? f : null;
  }

  protected asImage(f: AnyFeature): ImageFeature | null {
    return f.type === 'image' ? f : null;
  }

  protected asTextLike(f: AnyFeature): TextFeature | LaneFeature | null {
    return (f.type === 'text' || f.type === 'lane') ? f : null;
  }

  protected asLane(f: AnyFeature): LaneFeature | null {
    return f.type === 'lane' ? f : null;
  }

  protected asRect(f: AnyFeature): RectFeature | null {
    return f.type === 'rect' ? f : null;
  }

  protected rectFill(f: RectFeature): string {
    return f.bgColor;
  }

  protected rectFillOpacity(f: RectFeature): number {
    return f.bgOpacity / 100;
  }

  protected resolvedDisplayText(f: TextFeature | LaneFeature): string {
    return resolveTemplate(f.template, this.competitionStore.competition());
  }

  protected laneRows(f: LaneFeature): Array<{ y: number; text: string }> {
    const lanes = this.competitionStore.competition().pool.lanes;
    const now = this.now();
    const rowH = lanes.length > 0 ? f.height / lanes.length : f.height;
    return lanes.map((lane, i) => {
      const expired =
        f.displayDuration != null &&
        lane.timestamp != null &&
        now - lane.timestamp > f.displayDuration * 1000;
      return {
        y: f.y + i * rowH + f.fontSize,
        text: expired ? '' : resolveTemplate(f.template, lane),
      };
    });
  }

  protected textX(f: TextFeature | LaneFeature): number {
    if (f.align === 'center') return f.x + f.width / 2;
    if (f.align === 'right') return f.x + f.width;
    return f.x;
  }

  protected textAnchor(f: TextFeature | LaneFeature): string {
    const map: Record<TextAlign, string> = { left: 'start', center: 'middle', right: 'end' };
    return map[f.align];
  }

  protected textTransform(f: TextFeature | LaneFeature): string | null {
    const rotation = f.type === 'text' ? (f.rotation ?? 0) : 0;
    if (!rotation) return null;
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    return `rotate(${rotation}, ${cx}, ${cy})`;
  }

  // --- Interaction ---

  protected onBackgroundClick(): void {
    this.featureSelect.emit(null);
  }

  protected onFeatureClick(event: MouseEvent, feature: BaseFeature): void {
    event.stopPropagation();
    // Clicking any member of a group selects the group.
    this.featureSelect.emit(feature.groupId ?? feature.id);
  }

  protected onMoveStart(event: MouseEvent, feature: BaseFeature): void {
    event.stopPropagation();
    event.preventDefault();
    const { x, y } = this.toSVG(event);

    const isGroup = feature.type === 'group';
    const groupId = isGroup ? feature.id : null;
    const groupChildren = groupId
      ? this.features()
          .filter((f) => f.groupId === groupId)
          .map((f): GroupChild => ({ id: f.id, origX: f.x, origY: f.y, width: f.width, height: f.height }))
      : undefined;

    const bounds = groupId ? this.groupBoundsMap().get(groupId) : null;
    this.drag.set({
      featureId: feature.id,
      mode: 'move',
      startX: x, startY: y,
      origX: bounds?.x ?? feature.x,
      origY: bounds?.y ?? feature.y,
      origW: bounds?.width ?? feature.width,
      origH: bounds?.height ?? feature.height,
      currentX: x, currentY: y,
      groupChildren,
    });
    this.featureSelect.emit(feature.groupId ?? feature.id);
  }

  protected onResizeStart(event: MouseEvent, feature: BaseFeature): void {
    event.stopPropagation();
    event.preventDefault();
    const { x, y } = this.toSVG(event);
    this.drag.set({
      featureId: feature.id, mode: 'resize',
      startX: x, startY: y,
      origX: feature.x, origY: feature.y,
      origW: feature.width, origH: feature.height,
      currentX: x, currentY: y,
    });
    this.featureSelect.emit(feature.groupId ?? feature.id);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.drag()) return;
    const { x, y } = this.toSVG(event);
    this.drag.update((s) => s && ({ ...s, currentX: x, currentY: y }));
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    const d = this.drag();
    if (!d) return;

    if (d.groupChildren) {
      // Group move: commit updated positions for all children.
      const rawDx = d.currentX - d.startX;
      const rawDy = d.currentY - d.startY;
      const clampedX = clamp(d.origX + rawDx, 0, CANVAS_W - d.origW);
      const clampedY = clamp(d.origY + rawDy, 0, CANVAS_H - d.origH);
      const dx = round(clampedX - d.origX);
      const dy = round(clampedY - d.origY);
      const childMap = new Map(d.groupChildren.map((c) => [c.id, c]));
      const updated = this.features()
        .filter((f) => childMap.has(f.id))
        .map((f) => {
          const orig = childMap.get(f.id)!;
          return { ...f, x: orig.origX + dx, y: orig.origY + dy };
        });
      this.featuresUpdate.emit(updated as AnyFeature[]);
    } else {
      const feature = this.features().find((f) => f.id === d.featureId);
      if (feature) {
        const dx = d.currentX - d.startX;
        const dy = d.currentY - d.startY;
        const updated: BaseFeature = d.mode === 'move'
          ? { ...feature, x: round(clamp(d.origX + dx, 0, CANVAS_W - feature.width)), y: round(clamp(d.origY + dy, 0, CANVAS_H - feature.height)) }
          : { ...feature, width: round(clamp(d.origW + dx, 40, CANVAS_W - d.origX)), height: round(clamp(d.origH + dy, 20, CANVAS_H - d.origY)) };
        this.featureUpdate.emit(updated);
      }
    }
    this.drag.set(null);
  }

  private toSVG(event: MouseEvent): { x: number; y: number } {
    const svg = this.svgEl().nativeElement;
    const pt = new DOMPoint(event.clientX, event.clientY);
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number): number {
  return Math.round(v);
}
