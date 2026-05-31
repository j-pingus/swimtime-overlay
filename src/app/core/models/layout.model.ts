export type FeatureType = 'generic' | 'image' | 'text' | 'rect' | 'lane' | 'group' | 'polygon';
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
}

export interface ImageFeature extends FeatureBase {
  type: 'image';
  /** base64 data URL or HTTP URL */
  src: string;
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
}

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
}

export type AnyFeature = GenericFeature | GroupFeature | ImageFeature | TextFeature | RectFeature | LaneFeature | PolygonFeature;

/** Backward-compat alias used throughout the app. */
export type BaseFeature = AnyFeature;

export interface MessageTypeRule {
  layoutId: string;
  /** Automatically clear the active layout after this many seconds. Null = stay until next rule fires. */
  duration: number | null;
}

/** Keyed by SwimTimeMessageType string — loose-typed to avoid importing API models here. */
export type MessageTypeRules = Record<string, MessageTypeRule>;

export interface Layout {
  id: string;
  name: string;
  createdAt: number;
  features: AnyFeature[];
}
