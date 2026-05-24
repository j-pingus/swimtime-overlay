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

export interface Pool {
  lanes: Lane[];
}

export interface Heat {
  number: string;
}

export interface SwimEvent {
  number: string;
  stroke: string;
  category: string;
  distance: string;
  heats: Heat[];
}

export interface Competition {
  currentEvent: SwimEvent | null;
  currentHeat: Heat | null;
  pool: Pool;
}
