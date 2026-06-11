export interface LaneDto {
  laneId?: number;
  displayName?: string;
  club?: string;
  nat?: string;
  entryTime?: string;
  officialTime?: string;
  rank?: string;
  swimmerFullNames?: string[];
}

export interface LaptimeDto {
  event?: string;
  heat?: string;
  distance?: number;
  lane?: number;
  rank?: string;
  time?: string;
  timestamp?: number;
}

export const ALL_MESSAGE_TYPES = [
  'EVENT_LOADED', 'HEAT_LOADED', 'START_LIST', 'CLUB_LOADED', 'PODIUM',
  'COMPETITION_LOADED', 'LAPTIME_LOADED', 'TIME_KEEPING', 'HEAT_OFFICIAL',
  'SESSION_LOADED', 'ATHLETE_LOADED', 'ENTRY_LOADED', 'AGEGROUP_LOADED',
  'CHRONO_START', 'CHRONO_STOP', 'HEAT_ARRIVED', 'SITB_STOPPED',
  'MEDAL_CEREMONY', 'ALL',
] as const;

export type SwimTimeMessageType =
  | 'EVENT_LOADED'
  | 'HEAT_LOADED'
  | 'START_LIST'
  | 'CLUB_LOADED'
  | 'PODIUM'
  | 'COMPETITION_LOADED'
  | 'LAPTIME_LOADED'
  | 'TIME_KEEPING'
  | 'HEAT_OFFICIAL'
  | 'SESSION_LOADED'
  | 'ATHLETE_LOADED'
  | 'ENTRY_LOADED'
  | 'AGEGROUP_LOADED'
  | 'CHRONO_START'
  | 'CHRONO_STOP'
  | 'HEAT_ARRIVED'
  | 'SITB_STOPPED'
  | 'MEDAL_CEREMONY'
  | 'ALL';

export interface EventAndHeatDto {
  swimTimeMessageType?: SwimTimeMessageType;
  event?: string;
  countHeats?: number;
  heat?: string;
  splashHeatId?: number;
  isFinished?: boolean;
  stroke?: string;
  category?: string;
  distance?: string;
  startTime?: number;
  lanes?: LaneDto[];
}
