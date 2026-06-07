import { Injectable, signal, computed } from '@angular/core';
import { Competition, Lane, NextHeat } from '../models/domain.models';

export type CompetitionMode = 'live' | 'config';

export interface CompetitionStoreState {
  mode: CompetitionMode;
  laneCount: number;
  firstLane: number;
  competition: Competition;
}

const MODE_KEY       = 'swimtime_competition_mode';
const LANE_COUNT_KEY  = 'swimtime_lane_count';
const FIRST_LANE_KEY  = 'swimtime_first_lane';
const DEFAULT_LANES   = 8;
const DEFAULT_FIRST_LANE = 1;

// Full roster of dummy swimmers — pool is sliced/extended to match laneCount.
const DUMMY_ROSTER: Omit<Lane, 'number'>[] = [
  { swimmerName: 'Alice Martin',   club: 'CN Marseille',     nat: 'FRA', entryTime: '1:02.45', officialTime: '1:02.87', time: '1:02.87', rank: '3',  timestamp: null },
  { swimmerName: 'Emma Johnson',   club: 'Bath SC',          nat: 'GBR', entryTime: '1:01.12', officialTime: '1:01.34', time: '1:01.34', rank: '1',  timestamp: null },
  { swimmerName: 'Sophie Müller',  club: 'SG Frankfurt',     nat: 'GER', entryTime: '1:01.89', officialTime: '1:01.56', time: '1:01.56', rank: '2',  timestamp: null },
  { swimmerName: 'Laura García',   club: 'CN Barcelona',     nat: 'ESP', entryTime: '1:03.21', officialTime: '1:03.45', time: '1:03.45', rank: '4',  timestamp: null },
  { swimmerName: 'Anna Kowalski',  club: 'KS Wrocław',       nat: 'POL', entryTime: '1:03.88', officialTime: '1:02.87', time: '1:02.87', rank: '5',  timestamp: null },
  { swimmerName: 'Claire Dupont',  club: 'Swimming Antwerp', nat: 'BEL', entryTime: '1:04.12', officialTime: '1:01.34', time: '1:01.34', rank: '6',  timestamp: null },
  { swimmerName: 'Mia Hansen',     club: 'Virum SK',         nat: 'DEN', entryTime: '1:04.56', officialTime: '1:02.87', time: '1:02.87', rank: '7',  timestamp: null },
  { swimmerName: 'Lena Novak',     club: 'PK Bratislava',    nat: 'SVK', entryTime: '1:05.01', officialTime: '1:01.34', time: '1:01.34', rank: '9',  timestamp: null },
  { swimmerName: 'Sara Rossi',     club: 'Fiamme Oro',       nat: 'ITA', entryTime: '1:05.34', officialTime: '1:01.56', time: '1:01.56', rank: '8',  timestamp: null },
  { swimmerName: 'Petra Novotná',  club: 'SK Slavia Praha',  nat: 'CZE', entryTime: '1:05.67', officialTime: '1:03.45', time: '1:03.45', rank: '10', timestamp: null },
];

function emptyLane(number: number): Lane {
  return { number, swimmerName: '', club: '', nat: '', entryTime: null, officialTime: null, time: null, rank: null, timestamp: null };
}

function normalizeLanes(lanes: Lane[], laneCount: number, firstLane: number): Lane[] {
  const byNumber = new Map(lanes.map((l) => [l.number, l]));
  return Array.from({ length: laneCount }, (_, i) => {
    const n = firstLane + i;
    return byNumber.get(n) ?? emptyLane(n);
  });
}

function buildDummyLanes(laneCount: number, firstLane: number): Lane[] {
  return Array.from({ length: laneCount }, (_, i) => {
    const n = firstLane + i;
    const base = DUMMY_ROSTER[i] ?? {
      swimmerName: `Swimmer ${n}`,
      club: '',
      nat: '',
      entryTime: null,
      officialTime: null,
      time: null,
      rank: null,
      timestamp: null,
    };
    return { number: n, ...base };
  });
}

function buildDummyCompetition(laneCount: number, firstLane: number): Competition {
  return {
    currentEvent: { number: '14', stroke: 'Butterfly', category: 'Women', distance: '100', countHeats: 3 },
    currentHeat:  { number: '2', splashHeatId: 42, lanes: buildDummyLanes(laneCount, firstLane) },
    nextHeats: [
      { event: '14', heat: '3', stroke: 'Butterfly',   category: 'Men',   distance: '100', splashHeatId: 43, lanes: [] },
      { event: '15', heat: '1', stroke: 'Backstroke',  category: 'Women', distance: '200', splashHeatId: 44, lanes: [] },
      { event: '15', heat: '2', stroke: 'Backstroke',  category: 'Women', distance: '200', splashHeatId: 45, lanes: [] },
    ],
  };
}

const EMPTY_COMPETITION: Competition = {
  currentEvent: null,
  currentHeat:  null,
  nextHeats:    [],
};

@Injectable({ providedIn: 'root' })
export class CompetitionStore {
  private readonly _state = signal<CompetitionStoreState>(this.loadInitial());
  private localUpdateListeners: Array<(s: CompetitionStoreState) => void> = [];

  readonly mode         = computed(() => this._state().mode);
  readonly laneCount    = computed(() => this._state().laneCount);
  readonly firstLane    = computed(() => this._state().firstLane);
  readonly competition  = computed(() => this._state().competition);
  readonly currentEvent = computed(() => this._state().competition.currentEvent);
  readonly currentHeat  = computed(() => this._state().competition.currentHeat);
  readonly nextHeats    = computed(() => this._state().competition.nextHeats);

  // --- Mode ---

  setMode(mode: CompetitionMode): void {
    this.update((s) => ({
      ...s,
      mode,
      competition: mode === 'config' ? buildDummyCompetition(s.laneCount, s.firstLane) : EMPTY_COMPETITION,
    }));
  }

  // --- Lane count / first lane (config mode only — rebuilds the dummy pool) ---

  setLaneCount(count: number): void {
    this.update((s) => ({
      ...s,
      laneCount: count,
      competition: s.mode === 'config' && s.competition.currentHeat
        ? { ...s.competition, currentHeat: { ...s.competition.currentHeat, lanes: buildDummyLanes(count, s.firstLane) } }
        : s.competition,
    }));
  }

  setFirstLane(first: number): void {
    this.update((s) => ({
      ...s,
      firstLane: first,
      competition: s.mode === 'config' && s.competition.currentHeat
        ? { ...s.competition, currentHeat: { ...s.competition.currentHeat, lanes: buildDummyLanes(s.laneCount, first) } }
        : s.competition,
    }));
  }

  // --- Live updates (called by the live data service with already-mapped domain objects) ---

  setCompetition(competition: Competition): void {
    this.update((s) => {
      const sameHeat =
        s.competition.currentEvent?.number === competition.currentEvent?.number &&
        s.competition.currentHeat?.number === competition.currentHeat?.number;

      let lanes = normalizeLanes(competition.currentHeat?.lanes ?? [], s.laneCount, s.firstLane);

      if (sameHeat) {
        const currentByNumber = new Map((s.competition.currentHeat?.lanes ?? []).map((l) => [l.number, l]));
        lanes = lanes.map((lane) => {
          const existing = currentByNumber.get(lane.number);
          if (!existing) return lane;
          return { ...lane, time: existing.time, rank: existing.rank, timestamp: existing.timestamp };
        });
      }

      const currentHeat = competition.currentHeat ? { ...competition.currentHeat, lanes } : null;
      return { ...s, competition: { ...competition, currentHeat, nextHeats: s.competition.nextHeats } };
    });
  }

  setNextHeats(heats: NextHeat[]): void {
    this.update((s) => {
      const nextHeats = heats.map((h) => ({ ...h, lanes: normalizeLanes(h.lanes, s.laneCount, s.firstLane) }));
      return { ...s, competition: { ...s.competition, nextHeats } };
    });
  }

  updateLaneTimes(laneNumber: number, time: string, rank: string | null): void {
    this.update((s) => {
      if (!s.competition.currentHeat) return s;
      const lanes = s.competition.currentHeat.lanes.map((lane) =>
        lane.number === laneNumber ? { ...lane, time, rank: rank ?? lane.rank, timestamp: Date.now() } : lane,
      );
      return { ...s, competition: { ...s.competition, currentHeat: { ...s.competition.currentHeat, lanes } } };
    });
  }

  // --- Sync ---

  applyRemoteState(state: CompetitionStoreState): void {
    this._state.set(state);
  }

  onLocalUpdate(fn: (s: CompetitionStoreState) => void): () => void {
    this.localUpdateListeners.push(fn);
    return () => {
      this.localUpdateListeners = this.localUpdateListeners.filter((l) => l !== fn);
    };
  }

  getState(): CompetitionStoreState {
    return this._state();
  }

  // --- Internal ---

  private update(fn: (s: CompetitionStoreState) => CompetitionStoreState): void {
    const next = fn(this._state());
    this._state.set(next);
    this.persist(next);
    this.localUpdateListeners.forEach((l) => l(next));
  }

  private loadInitial(): CompetitionStoreState {
    const mode: CompetitionMode =
      localStorage.getItem(MODE_KEY) === 'live' ? 'live' : 'config';
    const laneCount =
      parseInt(localStorage.getItem(LANE_COUNT_KEY) ?? '', 10) || DEFAULT_LANES;
    const firstLane =
      parseInt(localStorage.getItem(FIRST_LANE_KEY) ?? '', 10);
    const resolvedFirstLane = isNaN(firstLane) ? DEFAULT_FIRST_LANE : firstLane;
    return {
      mode,
      laneCount,
      firstLane: resolvedFirstLane,
      competition: mode === 'config' ? buildDummyCompetition(laneCount, resolvedFirstLane) : EMPTY_COMPETITION,
    };
  }

  private persist(state: CompetitionStoreState): void {
    localStorage.setItem(MODE_KEY, state.mode);
    localStorage.setItem(LANE_COUNT_KEY, String(state.laneCount));
    localStorage.setItem(FIRST_LANE_KEY, String(state.firstLane));
  }
}
