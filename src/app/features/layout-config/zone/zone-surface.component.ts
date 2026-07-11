import {
  Component, inject, input, output, signal,
  viewChild, ElementRef, DestroyRef,
} from '@angular/core';
import {
  AnyFeature, ChronoFeature, ClockFeature, GroupFeature, ImageFeature,
  LaneFeature, PolygonFeature, RectFeature, TextFeature, TextAlign, HeatSource,
} from '../../../core/models/layout.model';
import { Competition, Lane } from '../../../core/models/domain.models';
import { CompetitionStore } from '../../../core/services/competition.store';
import { resolveTemplate } from '../../../core/utils/template.util';

export interface GroupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-zone-surface',
  templateUrl: './zone-surface.component.html',
  styleUrl: './zone-surface.component.scss',
})
export class ZoneSurfaceComponent {
  private readonly competitionStore = inject(CompetitionStore);
  private readonly now = signal(Date.now());
  protected readonly clockNow = signal(new Date());

  constructor() {
    const chronoId = setInterval(() => {
      // Skip when the chrono is frozen (stopped heat) — nothing time-sensitive to update.
      if (this.competitionStore.competition().chronoStopTime == null) {
        this.now.set(Date.now());
      }
    }, 100);
    // Wall-clock signal for ${HH}/${MM}/${SS} — runs unconditionally every second.
    const clockId = setInterval(() => this.clockNow.set(new Date()), 1000);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => { clearInterval(chronoId); clearInterval(clockId); });
  }

  readonly features = input<AnyFeature[]>([]);
  readonly groupBoundsMap = input<Map<string, GroupBounds>>(new Map());
  readonly selectedFeatureId = input<string | null>(null);
  readonly interactive = input<boolean>(true);

  readonly bgClick = output<void>();
  readonly featureClick = output<{ event: MouseEvent; feature: AnyFeature }>();
  readonly moveStart = output<{ event: MouseEvent; feature: AnyFeature }>();
  readonly resizeStart = output<{ event: MouseEvent; feature: AnyFeature }>();
  readonly pointDragStart = output<{ event: MouseEvent; feature: PolygonFeature; pointIndex: number }>();

  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgEl');

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

  protected asPolygon(f: AnyFeature): PolygonFeature | null {
    return f.type === 'polygon' ? f : null;
  }

  protected aschrono(f: AnyFeature): ChronoFeature | null {
    return f.type === 'chrono' ? f : null;
  }

  protected asClock(f: AnyFeature): ClockFeature | null {
    return f.type === 'clock' ? f : null;
  }

  protected clockHandLines(f: ClockFeature): {
    hour:   { x1: number; y1: number; x2: number; y2: number };
    minute: { x1: number; y1: number; x2: number; y2: number };
    second: { x1: number; y1: number; x2: number; y2: number };
  } {
    const now = this.clockNow();
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    const r = Math.min(f.width, f.height) / 2;
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const hourAngle   = (h + m / 60) * (Math.PI / 6);
    const minuteAngle = (m + s / 60) * (Math.PI / 30);
    const secondAngle = s             * (Math.PI / 30);
    const hand = (angle: number, len: number) => ({
      x1: cx, y1: cy,
      x2: cx + len * Math.sin(angle),
      y2: cy - len * Math.cos(angle),
    });
    return {
      hour:   hand(hourAngle,   r * 0.55),
      minute: hand(minuteAngle, r * 0.80),
      second: hand(secondAngle, r * 0.90),
    };
  }

  protected polygonPointsAttr(f: PolygonFeature): string {
    return f.points.map(pt => `${pt.x},${pt.y}`).join(' ');
  }

  protected rectFill(f: RectFeature): string {
    return f.bgColor;
  }

  protected rectFillOpacity(f: RectFeature): number {
    return f.bgOpacity / 100;
  }

  protected resolvedDisplayText(f: TextFeature | LaneFeature): string {
    return resolveTemplate(f.template, this.competitionStore.competition(), this.clockNow());
  }

  protected laneRows(f: LaneFeature): Array<{ y: number; text: string }> {
    const lanes = resolveLanes(this.competitionStore.competition(), f.heatSource);
    const now = this.now();
    const rowH = lanes.length > 0 ? f.height / lanes.length : f.height;
    return lanes.map((lane, i) => {
      const expired =
        f.displayDuration != null &&
        lane.timestamp != null &&
        now - lane.timestamp > f.displayDuration * 1000;
      return {
        y: f.y + (i + 0.5) * rowH,
        text: expired ? '' : resolveTemplate(f.template, lane),
      };
    });
  }

  protected textX(f: TextFeature | LaneFeature | ChronoFeature): number {
    if (f.align === 'center') return f.x + f.width / 2;
    if (f.align === 'right') return f.x + f.width;
    return f.x;
  }

  protected textAnchor(f: TextFeature | LaneFeature | ChronoFeature): string {
    const map: Record<TextAlign, string> = { left: 'start', center: 'middle', right: 'end' };
    return map[f.align];
  }

  protected chronoText(f: ChronoFeature): string {
    const c = this.competitionStore.competition();
    const startTime = c.chronoStartTime;
    if (startTime == null) return '0:00.0';
    const stopTime = c.chronoStopTime;
    const elapsedMs = stopTime != null ? stopTime - startTime : this.now() - startTime;
    return formatChrono(Math.max(0, elapsedMs));
  }

  protected textTransform(f: TextFeature | LaneFeature): string | null {
    const rotation = f.type === 'text' ? (f.rotation ?? 0) : 0;
    if (!rotation) return null;
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    return `rotate(${rotation}, ${cx}, ${cy})`;
  }

  // --- Event forwarders (stop propagation/default here so the template stays clean) ---

  protected onBgClick(): void {
    this.bgClick.emit();
  }

  protected onFeatClick(event: MouseEvent, feature: AnyFeature): void {
    event.stopPropagation();
    this.featureClick.emit({ event, feature });
  }

  protected onMoveDragStart(event: MouseEvent, feature: AnyFeature): void {
    event.stopPropagation();
    event.preventDefault();
    this.moveStart.emit({ event, feature });
  }

  protected onResizeDragStart(event: MouseEvent, feature: AnyFeature): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizeStart.emit({ event, feature });
  }

  protected onPointDragBegin(event: MouseEvent, feature: PolygonFeature, pointIndex: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.pointDragStart.emit({ event, feature, pointIndex });
  }

  /** Converts client coordinates to SVG canvas coordinates. Called by the parent ZoneComponent. */
  toSVGCoords(clientX: number, clientY: number): { x: number; y: number } {
    const svg = this.svgEl().nativeElement;
    const pt = new DOMPoint(clientX, clientY);
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: p.x, y: p.y };
  }
}

function resolveLanes(competition: Competition, heatSource: HeatSource): Lane[] {
  const nextIndex = heatSource === 'next0' ? 0 : heatSource === 'next1' ? 1 : heatSource === 'next2' ? 2 : -1;
  if (nextIndex >= 0) {
    const next = competition.nextHeats[nextIndex];
    if (next?.lanes?.length) return next.lanes;
  }
  return competition.currentHeat?.lanes ?? [];
}

function formatChrono(ms: number): string {
  const totalDs = Math.floor(ms / 100);
  const ds = totalDs % 10;
  const totalS = Math.floor(totalDs / 10);
  const s = totalS % 60;
  const m = Math.floor(totalS / 60);
  return `${m}:${String(s).padStart(2, '0')}.${ds}`;
}
