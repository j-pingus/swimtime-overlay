export type FeatureType = 'generic';

export interface BaseFeature {
  id: string;
  type: FeatureType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layout {
  id: string;
  name: string;
  createdAt: number;
  features: BaseFeature[];
}
