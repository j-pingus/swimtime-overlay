import {
  Component, input, output, computed, signal,
  viewChild, ElementRef, HostListener,
} from '@angular/core';
import { BaseFeature } from '../../../core/models/layout.model';

export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

type DragMode = 'move' | 'resize';

interface DragState {
  featureId: string;
  mode: DragMode;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

@Component({
  selector: 'app-zone',
  templateUrl: './zone.component.html',
  styleUrl: './zone.component.scss',
})
export class ZoneComponent {
  readonly features = input<BaseFeature[]>([]);
  readonly selectedFeatureId = input<string | null>(null);

  readonly featureSelect = output<string | null>();
  readonly featureUpdate = output<BaseFeature>();

  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgEl');
  private readonly drag = signal<DragState | null>(null);

  /** Merges drag-preview position into the feature list for live feedback. */
  protected readonly displayFeatures = computed(() => {
    const dragging = this.drag();
    return this.features().map((f) => {
      if (!dragging || f.id !== dragging.featureId) return f;
      return dragging.mode === 'move'
        ? { ...f, x: dragging.origX, y: dragging.origY }
        : { ...f, width: dragging.origW, height: dragging.origH };
    });
  });

  protected readonly ANCHOR = 16; // anchor circle radius in canvas units

  // --- Interaction ---

  protected onBackgroundClick(): void {
    this.featureSelect.emit(null);
  }

  protected onFeatureClick(event: MouseEvent, feature: BaseFeature): void {
    event.stopPropagation();
    this.featureSelect.emit(feature.id);
  }

  protected onMoveStart(event: MouseEvent, feature: BaseFeature): void {
    event.stopPropagation();
    event.preventDefault();
    const { x, y } = this.toSVG(event);
    this.drag.set({
      featureId: feature.id,
      mode: 'move',
      startX: x, startY: y,
      origX: feature.x, origY: feature.y,
      origW: feature.width, origH: feature.height,
    });
    this.featureSelect.emit(feature.id);
  }

  protected onResizeStart(event: MouseEvent, feature: BaseFeature): void {
    event.stopPropagation();
    event.preventDefault();
    const { x, y } = this.toSVG(event);
    this.drag.set({
      featureId: feature.id,
      mode: 'resize',
      startX: x, startY: y,
      origX: feature.x, origY: feature.y,
      origW: feature.width, origH: feature.height,
    });
    this.featureSelect.emit(feature.id);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const state = this.drag();
    if (!state) return;

    const { x, y } = this.toSVG(event);
    const dx = x - state.startX;
    const dy = y - state.startY;
    const feature = this.features().find((f) => f.id === state.featureId);
    if (!feature) return;

    if (state.mode === 'move') {
      this.drag.update((s) => s && ({
        ...s,
        origX: clamp(state.origX + dx, 0, CANVAS_W - feature.width),
        origY: clamp(state.origY + dy, 0, CANVAS_H - feature.height),
      }));
    } else {
      this.drag.update((s) => s && ({
        ...s,
        origW: Math.max(40, state.origW + dx),
        origH: Math.max(20, state.origH + dy),
      }));
    }
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    const state = this.drag();
    if (!state) return;

    const feature = this.features().find((f) => f.id === state.featureId);
    if (feature) {
      const updated: BaseFeature =
        state.mode === 'move'
          ? { ...feature, x: state.origX, y: state.origY }
          : { ...feature, width: state.origW, height: state.origH };
      this.featureUpdate.emit(updated);
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
