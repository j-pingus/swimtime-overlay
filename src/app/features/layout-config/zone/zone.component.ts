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
  /** SVG coords where the drag started — never mutated. */
  startX: number;
  startY: number;
  /** Feature geometry when the drag started — never mutated. */
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  /** Current SVG mouse position — updated every mousemove. */
  currentX: number;
  currentY: number;
}

@Component({
  selector: 'app-zone',
  templateUrl: './zone.component.html',
  styleUrl: './zone.component.scss',
})
export class ZoneComponent {
  readonly features = input<BaseFeature[]>([]);
  readonly selectedFeatureId = input<string | null>(null);
  /** When false the zone is display-only: no anchors, no canvas hint, no interaction. */
  readonly interactive = input<boolean>(true);

  readonly featureSelect = output<string | null>();
  readonly featureUpdate = output<BaseFeature>();

  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgEl');
  private readonly drag = signal<DragState | null>(null);

  /** Merges drag-preview geometry into the feature list for live feedback. */
  protected readonly displayFeatures = computed(() => {
    const d = this.drag();
    return this.features().map((f) => {
      if (!d || f.id !== d.featureId) return f;
      const dx = d.currentX - d.startX;
      const dy = d.currentY - d.startY;
      return d.mode === 'move'
        ? { ...f, x: clamp(d.origX + dx, 0, CANVAS_W - f.width), y: clamp(d.origY + dy, 0, CANVAS_H - f.height) }
        : { ...f, width: Math.max(40, d.origW + dx), height: Math.max(20, d.origH + dy) };
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
      featureId: feature.id, mode: 'move',
      startX: x, startY: y,
      origX: feature.x, origY: feature.y,
      origW: feature.width, origH: feature.height,
      currentX: x, currentY: y,
    });
    this.featureSelect.emit(feature.id);
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
    this.featureSelect.emit(feature.id);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.drag()) return;
    const { x, y } = this.toSVG(event);
    // Only update current mouse position — orig* and start* stay frozen.
    this.drag.update((s) => s && ({ ...s, currentX: x, currentY: y }));
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    const d = this.drag();
    if (!d) return;

    const feature = this.features().find((f) => f.id === d.featureId);
    if (feature) {
      // Commit the same geometry that displayFeatures showed as preview.
      const dx = d.currentX - d.startX;
      const dy = d.currentY - d.startY;
      const updated: BaseFeature = d.mode === 'move'
        ? { ...feature, x: clamp(d.origX + dx, 0, CANVAS_W - feature.width), y: clamp(d.origY + dy, 0, CANVAS_H - feature.height) }
        : { ...feature, width: Math.max(40, d.origW + dx), height: Math.max(20, d.origH + dy) };
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
