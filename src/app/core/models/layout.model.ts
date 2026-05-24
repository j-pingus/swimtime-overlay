export type FeatureType = 'generic' | 'image' | 'text';
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

export type AnyFeature = GenericFeature | ImageFeature | TextFeature;

/** Backward-compat alias used throughout the app. */
export type BaseFeature = AnyFeature;

export interface Layout {
  id: string;
  name: string;
  createdAt: number;
  features: AnyFeature[];
}
