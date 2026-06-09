export interface Lane {
  number: number;
  swimmerName: string;
  club: string;
  nat: string;
  entryTime: string | null;
  /** Final official time once the heat is finished. */
  officialTime: string | null;
  /** Live time updated by SSE lap-time events during the race. */
  time: string | null;
  rank: string | null;
  /** Unix ms timestamp of the last data update for this lane; null until first update. */
  timestamp: number | null;
}

export interface Heat {
  number: string;
  splashHeatId?: number;
  lanes: Lane[];
}

export interface SwimEvent {
  number: string;
  stroke: string;
  category: string;
  distance: string;
  countHeats?: number;
}

export interface NextHeat {
  event: string;
  heat: string;
  stroke: string;
  category: string;
  distance: string;
  splashHeatId?: number;
  lanes: Lane[];
}

export interface Competition {
  currentEvent: SwimEvent | null;
  currentHeat: Heat | null;
  nextHeats: NextHeat[];
  /** Unix ms timestamp when CHRONO_START fired; null before first start or after heat reset. */
  chronoStartTime: number | null;
  /** Unix ms timestamp when HEAT_ARRIVED fired (chrono frozen); null while running. */
  chronoStopTime: number | null;
}
