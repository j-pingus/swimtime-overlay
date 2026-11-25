export const ALL_FEATURE_TYPES = ['generic', 'image', 'text', 'rect', 'lane', 'flag', 'group', 'polygon', 'chrono', 'clock'] as const;
export type FeatureType = typeof ALL_FEATURE_TYPES[number];
export type TextAlign = 'left' | 'center' | 'right';

interface FeatureBase {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Id of the GroupFeature this feature belongs to, if any. */
  groupId?: string;
}

export interface GenericFeature extends FeatureBase {
  type: 'generic';
}

/** A group container — rendered as a dashed bounding box in the zone.
 *  Its x/y/width/height are ignored; the zone computes them from its children. */
export interface GroupFeature extends FeatureBase {
  type: 'group';
  /** Cumulative rotation (degrees) applied to this group's children via applyGroupRotation. */
  rotation?: number;
}

export interface ImageFeature extends FeatureBase {
  type: 'image';
  /** base64 data URL or HTTP URL */
  src: string;
  /** Clockwise rotation in degrees around the feature centre. Defaults to 0. */
  rotation?: number;
}

export interface TextFeature extends FeatureBase {
  type: 'text';
  /** Raw template — $path.to.value patterns are resolved against Competition at render time. */
  template: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  outlineColor: string | null;
  outlineWidth: number;
  /** Clockwise rotation in degrees around the feature centre. Defaults to 0. */
  rotation?: number;
}

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface PolygonFeature extends FeatureBase {
  type: 'polygon';
  points: PolygonPoint[];
  bgColor: string;
  /** Fill opacity 0–100. */
  bgOpacity: number;
}

export interface RectFeature extends FeatureBase {
  type: 'rect';
  bgColor: string;
  /** Background opacity 0–100. */
  bgOpacity: number;
  border: boolean;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  /** Insets the visual rectangle from the bounding-box edges on all sides. */
  padding: number;
  /** Clockwise rotation in degrees around the feature centre. Defaults to 0. */
  rotation?: number;
}

export type HeatSource = 'current' | 'next0' | 'next1' | 'next2';

export type LaneOrder = 'lane' | 'rank';

export interface LaneFeature extends FeatureBase {
  type: 'lane';
  /** Template evaluated once per lane; $-patterns resolve against each Lane object. */
  template: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  outlineColor: string | null;
  outlineWidth: number;
  /** Hide lane data this many seconds after its timestamp. Null = always show. */
  displayDuration: number | null;
  /** Which heat's lanes to display. Defaults to 'current'. */
  heatSource: HeatSource;
  /** Row ordering: by lane number or by rank. Defaults to 'lane'. */
  laneOrder: LaneOrder;
}

export interface FlagFeature extends FeatureBase {
  type: 'flag';
  /** Which heat's lanes to display. Defaults to 'current'. */
  heatSource: HeatSource;
  /** Hide flag this many seconds after lane timestamp. Null = always show. */
  displayDuration: number | null;
  /** Row ordering: by lane number or by rank. Defaults to 'lane'. */
  laneOrder: LaneOrder;
  /** Which nation code drives the flag: swimmer's nat or club's clubNat. Defaults to 'swimmer'. */
  natSource: 'swimmer' | 'club';
  /** Show only the lane with this lane number. Null = show all lanes. */
  laneFilter: number | null;
  /** Clockwise rotation in degrees around the feature centre. Defaults to 0. */
  rotation?: number;
}

export interface ChronoFeature extends FeatureBase {
  type: 'chrono';
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  outlineColor: string | null;
  outlineWidth: number;
  /** Clockwise rotation in degrees around the feature centre. Defaults to 0. */
  rotation?: number;
}

export interface ClockFeature extends FeatureBase {
  type: 'clock';
  color: string;
  hourHandWidth: number;
  minuteHandWidth: number;
  secondHandWidth: number;
}

export type AnyFeature = GenericFeature | GroupFeature | ImageFeature | TextFeature | RectFeature | LaneFeature | FlagFeature | PolygonFeature | ChronoFeature | ClockFeature;

/** Backward-compat alias used throughout the app. */
export type BaseFeature = AnyFeature;

export interface MessageTypeRule {
  id: string;
  messageType: string;
  layoutId: string;
  /** Delay in seconds before the layout is activated. Null = activate immediately. */
  delay: number | null;
  /** Automatically clear the active layout after this many seconds. Null = stay until next rule fires. */
  duration: number | null;
}

export type MessageTypeRules = MessageTypeRule[];

export const RENDER_FONTS: { label: string; value: string; googleFont: string | null }[] = [
  { label: 'System (sans-serif)', value: 'sans-serif',       googleFont: null },
  { label: 'Inter',               value: 'Inter',            googleFont: 'Inter:wght@400;700' },
  { label: 'Roboto',              value: 'Roboto',           googleFont: 'Roboto:wght@400;700' },
  { label: 'Oswald',              value: 'Oswald',           googleFont: 'Oswald:wght@400;700' },
  { label: 'Barlow Condensed',    value: 'Barlow Condensed', googleFont: 'Barlow+Condensed:wght@400;700' },
  { label: 'Bebas Neue',          value: 'Bebas Neue',       googleFont: 'Bebas+Neue' },
  { label: 'Montserrat',          value: 'Montserrat',       googleFont: 'Montserrat:wght@400;700' },
  { label: 'Rajdhani',            value: 'Rajdhani',         googleFont: 'Rajdhani:wght@400;700' },
];

export interface Layout {
  id: string;
  name: string;
  createdAt: number;
  features: AnyFeature[];
  fontFamily: string;
  /** True when this layout has been persisted to the server resource API. */
  serverSaved?: boolean;
}
