import {
  Component, input, output, computed, signal,
  viewChild, HostListener,
} from '@angular/core';
import { AnyFeature, BaseFeature, PolygonFeature, PolygonPoint } from '../../../core/models/layout.model';
import { ZoneSurfaceComponent, GroupBounds } from './zone-surface.component';

export type { GroupBounds } from './zone-surface.component';

export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

type DragMode = 'move' | 'resize' | 'point';

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
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  currentX: number;
  currentY: number;
  groupChildren?: GroupChild[];
  pointIndex?: number;
  origPoints?: PolygonPoint[];
}

@Component({
  selector: 'app-zone',
  imports: [ZoneSurfaceComponent],
  templateUrl: './zone.component.html',
  styleUrl: './zone.component.scss',
})
export class ZoneComponent {
  readonly features = input<BaseFeature[]>([]);
  readonly selectedFeatureId = input<string | null>(null);
  readonly interactive = input<boolean>(true);

  readonly featureSelect = output<string | null>();
  readonly featureUpdate = output<BaseFeature>();
  readonly featuresUpdate = output<AnyFeature[]>();

  private readonly surface = viewChild.required(ZoneSurfaceComponent);
  private readonly drag = signal<DragState | null>(null);

  protected readonly displayFeatures = computed(() => {
    const d = this.drag();
    if (!d) return this.features();

    const rawDx = d.currentX - d.startX;
    const rawDy = d.currentY - d.startY;

    if (d.groupChildren) {
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

    if (d.mode === 'point' && d.origPoints !== undefined && d.pointIndex !== undefined) {
      return this.features().map((f) => {
        if (f.id !== d.featureId || f.type !== 'polygon') return f;
        const newPoints = d.origPoints!.map((pt, i) =>
          i === d.pointIndex ? { x: pt.x + rawDx, y: pt.y + rawDy } : pt,
        );
        return { ...(f as PolygonFeature), points: newPoints };
      });
    }

    return this.features().map((f) => {
      if (f.id !== d.featureId) return f;
      if (d.mode === 'move') {
        const newX = clamp(d.origX + rawDx, 0, CANVAS_W - f.width);
        const newY = clamp(d.origY + rawDy, 0, CANVAS_H - f.height);
        if (f.type === 'polygon') {
          const shiftX = newX - d.origX;
          const shiftY = newY - d.origY;
          return { ...(f as PolygonFeature), x: newX, y: newY, points: (f as PolygonFeature).points.map(pt => ({ x: pt.x + shiftX, y: pt.y + shiftY })) };
        }
        return { ...f, x: newX, y: newY };
      }
      return { ...f, width: clamp(d.origW + rawDx, 40, CANVAS_W - d.origX), height: clamp(d.origH + rawDy, 20, CANVAS_H - d.origY) };
    });
  });

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

  protected onBgClick(): void {
    this.featureSelect.emit(null);
  }

  protected onFeatureClick({ feature }: { event: MouseEvent; feature: AnyFeature }): void {
    this.featureSelect.emit(feature.groupId ?? feature.id);
  }

  protected onMoveStart({ event, feature }: { event: MouseEvent; feature: AnyFeature }): void {
    const { x, y } = this.surface().toSVGCoords(event.clientX, event.clientY);

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

  protected onResizeStart({ event, feature }: { event: MouseEvent; feature: AnyFeature }): void {
    const { x, y } = this.surface().toSVGCoords(event.clientX, event.clientY);
    this.drag.set({
      featureId: feature.id, mode: 'resize',
      startX: x, startY: y,
      origX: feature.x, origY: feature.y,
      origW: feature.width, origH: feature.height,
      currentX: x, currentY: y,
    });
    this.featureSelect.emit(feature.groupId ?? feature.id);
  }

  protected onPointDragStart({ event, feature, pointIndex }: { event: MouseEvent; feature: PolygonFeature; pointIndex: number }): void {
    const { x, y } = this.surface().toSVGCoords(event.clientX, event.clientY);
    this.drag.set({
      featureId: feature.id,
      mode: 'point',
      startX: x, startY: y,
      origX: feature.points[pointIndex].x,
      origY: feature.points[pointIndex].y,
      origW: 0, origH: 0,
      currentX: x, currentY: y,
      pointIndex,
      origPoints: feature.points.map(p => ({ ...p })),
    });
    this.featureSelect.emit(feature.id);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Don't steal keys from form fields in the panel.
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const id = this.selectedFeatureId();
    if (!id || !this.interactive()) return;

    const dx = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const dy = event.key === 'ArrowDown'  ? 1 : event.key === 'ArrowUp'   ? -1 : 0;
    if (dx === 0 && dy === 0) return;

    event.preventDefault();

    const step = event.shiftKey ? 10 : 1;
    const resize = event.altKey;

    const feature = this.features().find((f) => f.id === id);
    if (!feature) return;

    if (feature.type === 'group') {
      // Move all children; groups have no intrinsic position to resize.
      const children = this.features().filter((f) => f.groupId === id);
      if (children.length === 0) return;
      const updated = children.map((f) => ({
        ...f,
        x: clamp(f.x + dx * step, 0, CANVAS_W - f.width),
        y: clamp(f.y + dy * step, 0, CANVAS_H - f.height),
      }));
      this.featuresUpdate.emit(updated as AnyFeature[]);
      return;
    }

    if (resize) {
      // Polygons are resized by dragging individual points, not by bounding box.
      if (feature.type === 'polygon') return;
      this.featureUpdate.emit({
        ...feature,
        width:  clamp(feature.width  + dx * step, 40, CANVAS_W - feature.x),
        height: clamp(feature.height + dy * step, 20, CANVAS_H - feature.y),
      });
    } else {
      if (feature.type === 'polygon') {
        const poly = feature as PolygonFeature;
        const newX = clamp(poly.x + dx * step, 0, CANVAS_W - poly.width);
        const newY = clamp(poly.y + dy * step, 0, CANVAS_H - poly.height);
        const shiftX = newX - poly.x;
        const shiftY = newY - poly.y;
        this.featureUpdate.emit({
          ...poly, x: newX, y: newY,
          points: poly.points.map((pt) => ({ x: pt.x + shiftX, y: pt.y + shiftY })),
        });
      } else {
        this.featureUpdate.emit({
          ...feature,
          x: clamp(feature.x + dx * step, 0, CANVAS_W - feature.width),
          y: clamp(feature.y + dy * step, 0, CANVAS_H - feature.height),
        });
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.drag()) return;
    const { x, y } = this.surface().toSVGCoords(event.clientX, event.clientY);
    this.drag.update((s) => s && ({ ...s, currentX: x, currentY: y }));
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    const d = this.drag();
    if (!d) return;

    if (d.groupChildren) {
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
    } else if (d.mode === 'point' && d.origPoints !== undefined && d.pointIndex !== undefined) {
      const feature = this.features().find((f) => f.id === d.featureId);
      if (feature?.type === 'polygon') {
        const poly = feature as PolygonFeature;
        const dx = round(d.currentX - d.startX);
        const dy = round(d.currentY - d.startY);
        const newPoints = d.origPoints.map((pt, i) =>
          i === d.pointIndex ? { x: pt.x + dx, y: pt.y + dy } : pt,
        );
        this.featureUpdate.emit({ ...poly, points: newPoints, ...polygonBBox(newPoints) });
      }
    } else {
      const feature = this.features().find((f) => f.id === d.featureId);
      if (feature) {
        const dx = d.currentX - d.startX;
        const dy = d.currentY - d.startY;
        if (d.mode === 'move' && feature.type === 'polygon') {
          const poly = feature as PolygonFeature;
          const newX = round(clamp(d.origX + dx, 0, CANVAS_W - feature.width));
          const newY = round(clamp(d.origY + dy, 0, CANVAS_H - feature.height));
          const shiftX = newX - feature.x;
          const shiftY = newY - feature.y;
          const newPoints = poly.points.map(pt => ({ x: pt.x + shiftX, y: pt.y + shiftY }));
          this.featureUpdate.emit({ ...poly, x: newX, y: newY, points: newPoints });
        } else {
          const updated: BaseFeature = d.mode === 'move'
            ? { ...feature, x: round(clamp(d.origX + dx, 0, CANVAS_W - feature.width)), y: round(clamp(d.origY + dy, 0, CANVAS_H - feature.height)) }
            : { ...feature, width: round(clamp(d.origW + dx, 40, CANVAS_W - d.origX)), height: round(clamp(d.origH + dy, 20, CANVAS_H - d.origY)) };
          this.featureUpdate.emit(updated);
        }
      }
    }
    this.drag.set(null);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number): number {
  return Math.round(v);
}

function polygonBBox(points: PolygonPoint[]): { x: number; y: number; width: number; height: number } {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
