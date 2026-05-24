export type FeatureType = 'generic' | 'image';

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

export type AnyFeature = GenericFeature | ImageFeature;

/** Backward-compat alias used throughout the app. */
export type BaseFeature = AnyFeature;

export interface Layout {
  id: string;
  name: string;
  createdAt: number;
  features: AnyFeature[];
}
