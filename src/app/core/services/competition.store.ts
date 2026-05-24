import { Injectable, signal, computed } from '@angular/core';
import { Competition, Lane, Pool } from '../models/domain.models';

export type CompetitionMode = 'live' | 'config';

export interface CompetitionStoreState {
  mode: CompetitionMode;
  laneCount: number;
  competition: Competition;
}

const MODE_KEY       = 'swimtime_competition_mode';
const LANE_COUNT_KEY = 'swimtime_lane_count';
const DEFAULT_LANES  = 8;

// Full roster of dummy swimmers — pool is sliced/extended to match laneCount.
const DUMMY_ROSTER: Omit<Lane, 'number'>[] = [
  { swimmerName: 'Alice Martin',   club: 'CN Marseille',     nat: 'FRA', entryTime: '1:02.45', officialTime: '1:02.87', time: '1:02.87', rank: '3' },
  { swimmerName: 'Emma Johnson',   club: 'Bath SC',          nat: 'GBR', entryTime: '1:01.12', officialTime: '1:01.34', time: '1:01.34', rank: '1' },
  { swimmerName: 'Sophie Müller',  club: 'SG Frankfurt',     nat: 'GER', entryTime: '1:01.89', officialTime: '1:01.56', time: '1:01.56', rank: '2' },
  { swimmerName: 'Laura García',   club: 'CN Barcelona',     nat: 'ESP', entryTime: '1:03.21', officialTime: '1:03.45', time: '1:03.45', rank: '4' },
  { swimmerName: 'Anna Kowalski',  club: 'KS Wrocław',       nat: 'POL', entryTime: '1:03.88', officialTime: '1:02.87', time: '1:02.87', rank: '5' },
  { swimmerName: 'Claire Dupont',  club: 'Swimming Antwerp', nat: 'BEL', entryTime: '1:04.12', officialTime: '1:01.34', time: '1:01.34', rank: '6' },
  { swimmerName: 'Mia Hansen',     club: 'Virum SK',         nat: 'DEN', entryTime: '1:04.56', officialTime: '1:02.87', time: '1:02.87', rank: '7' },
  { swimmerName: 'Lena Novak',     club: 'PK Bratislava',    nat: 'SVK', entryTime: '1:05.01', officialTime: '1:01.34', time: '1:01.34', rank: '9' },
  { swimmerName: 'Sara Rossi',     club: 'Fiamme Oro',       nat: 'ITA', entryTime: '1:05.34', officialTime: '1:01.56', time: '1:01.56', rank: '8' },
  { swimmerName: 'Petra Novotná',  club: 'SK Slavia Praha',  nat: 'CZE', entryTime: '1:05.67', officialTime: '1:03.45', time: '1:03.45', rank: '10' },
];

function buildDummyPool(laneCount: number): Pool {
  const lanes: Lane[] = Array.from({ length: laneCount }, (_, i) => {
    const base = DUMMY_ROSTER[i] ?? {
      swimmerName: `Swimmer ${i + 1}`,
      club: '',
      nat: '',
      entryTime: null,
      officialTime: null,
      time: null,
      rank: null,
    };
    return { number: i + 1, ...base };
  });
  return { lanes };
}

function buildDummyCompetition(laneCount: number): Competition {
  return {
    currentEvent: { number: '14', stroke: 'Butterfly', category: 'Women', distance: '100', heats: [{ number: '1' }, { number: '2' }, { number: '3' }] },
    currentHeat:  { number: '2' },
    nextEvent:    { number: '15', stroke: 'Backstroke', category: 'Men', distance: '200', heats: [{ number: '1' }, { number: '2' }] },
    pool: buildDummyPool(laneCount),
  };
}

const EMPTY_COMPETITION: Competition = {
  currentEvent: null,
  currentHeat:  null,
  nextEvent:    null,
  pool:         { lanes: [] },
};

@Injectable({ providedIn: 'root' })
export class CompetitionStore {
  private readonly _state = signal<CompetitionStoreState>(this.loadInitial());
  private localUpdateListeners: Array<(s: CompetitionStoreState) => void> = [];

  readonly mode         = computed(() => this._state().mode);
  readonly laneCount    = computed(() => this._state().laneCount);
  readonly competition  = computed(() => this._state().competition);
  readonly pool         = computed(() => this._state().competition.pool);
  readonly currentEvent = computed(() => this._state().competition.currentEvent);
  readonly currentHeat  = computed(() => this._state().competition.currentHeat);
  readonly nextEvent    = computed(() => this._state().competition.nextEvent);

  // --- Mode ---

  setMode(mode: CompetitionMode): void {
    this.update((s) => ({
      ...s,
      mode,
      competition: mode === 'config' ? buildDummyCompetition(s.laneCount) : EMPTY_COMPETITION,
    }));
  }

  // --- Lane count (config mode only — rebuilds the dummy pool) ---

  setLaneCount(count: number): void {
    this.update((s) => ({
      ...s,
      laneCount: count,
      competition: s.mode === 'config'
        ? { ...s.competition, pool: buildDummyPool(count) }
        : s.competition,
    }));
  }

  // --- Live updates (called by the live data service with already-mapped domain objects) ---

  setCompetition(competition: Competition): void {
    this.update((s) => ({ ...s, competition }));
  }

  updateLaneTimes(laneNumber: number, time: string, rank: string | null): void {
    this.update((s) => {
      const lanes = s.competition.pool.lanes.map((lane) =>
        lane.number === laneNumber ? { ...lane, time, rank: rank ?? lane.rank } : lane,
      );
      return { ...s, competition: { ...s.competition, pool: { lanes } } };
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
    return {
      mode,
      laneCount,
      competition: mode === 'config' ? buildDummyCompetition(laneCount) : EMPTY_COMPETITION,
    };
  }

  private persist(state: CompetitionStoreState): void {
    localStorage.setItem(MODE_KEY, state.mode);
    localStorage.setItem(LANE_COUNT_KEY, String(state.laneCount));
  }
}
