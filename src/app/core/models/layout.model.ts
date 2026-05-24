export type FeatureType = 'generic' | 'image' | 'text' | 'rect' | 'lane';
export type TextAlign = 'left' | 'center' | 'right';

interface FeatureBase {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GenericFeature extends FeatureBase {
  type: 'generic';
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
  /** Hide lane data this many seconds after its timestamp. Null = always show. */
  displayDuration: number | null;
}

export type AnyFeature = GenericFeature | ImageFeature | TextFeature | RectFeature | LaneFeature;

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
