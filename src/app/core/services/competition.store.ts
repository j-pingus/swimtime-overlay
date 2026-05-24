import { Injectable, signal, computed } from '@angular/core';
import { Competition, Lane, Pool, SwimEvent, Heat } from '../models/domain.models';

export type CompetitionMode = 'live' | 'config';

export interface CompetitionStoreState {
  mode: CompetitionMode;
  competition: Competition;
}

const MODE_KEY = 'swimtime_competition_mode';

const DUMMY_LANES: Lane[] = [
  { number: 1, swimmerName: 'Alice Martin',  club: 'CN Marseille',    nat: 'FRA', entryTime: '1:02.45', officialTime: null, time: '1:02.87', rank: '3' },
  { number: 2, swimmerName: 'Emma Johnson',  club: 'Bath SC',         nat: 'GBR', entryTime: '1:01.12', officialTime: null, time: '1:01.34', rank: '1' },
  { number: 3, swimmerName: 'Sophie Müller', club: 'SG Frankfurt',    nat: 'GER', entryTime: '1:01.89', officialTime: null, time: '1:01.56', rank: '2' },
  { number: 4, swimmerName: 'Laura García',  club: 'CN Barcelona',    nat: 'ESP', entryTime: '1:03.21', officialTime: null, time: '1:03.45', rank: '4' },
  { number: 5, swimmerName: 'Anna Kowalski', club: 'KS Wrocław',      nat: 'POL', entryTime: '1:03.88', officialTime: null, time: null,       rank: null },
  { number: 6, swimmerName: 'Claire Dupont', club: 'Swimming Antwerp',nat: 'BEL', entryTime: '1:04.12', officialTime: null, time: null,       rank: null },
  { number: 7, swimmerName: 'Mia Hansen',    club: 'Virum SK',        nat: 'DEN', entryTime: '1:04.56', officialTime: null, time: null,       rank: null },
  { number: 8, swimmerName: 'Lena Novak',    club: 'PK Bratislava',   nat: 'SVK', entryTime: '1:05.01', officialTime: null, time: null,       rank: null },
];

const DUMMY_COMPETITION: Competition = {
  currentEvent: { number: '14', stroke: 'Butterfly', category: 'Women', distance: '100', heats: [{ number: '1' }, { number: '2' }, { number: '3' }] },
  currentHeat:  { number: '2' },
  nextEvent:    { number: '15', stroke: 'Backstroke', category: 'Men', distance: '200', heats: [{ number: '1' }, { number: '2' }] },
  pool: { lanes: DUMMY_LANES },
};

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

  readonly mode        = computed(() => this._state().mode);
  readonly competition = computed(() => this._state().competition);
  readonly pool        = computed(() => this._state().competition.pool);
  readonly currentEvent = computed(() => this._state().competition.currentEvent);
  readonly currentHeat  = computed(() => this._state().competition.currentHeat);
  readonly nextEvent    = computed(() => this._state().competition.nextEvent);

  // --- Mode ---

  setMode(mode: CompetitionMode): void {
    const competition = mode === 'config' ? DUMMY_COMPETITION : EMPTY_COMPETITION;
    this.update(() => ({ mode, competition }));
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
    this.persistMode(next.mode);
    this.localUpdateListeners.forEach((l) => l(next));
  }

  private loadInitial(): CompetitionStoreState {
    const saved = localStorage.getItem(MODE_KEY);
    const mode: CompetitionMode = saved === 'live' ? 'live' : 'config';
    return { mode, competition: mode === 'config' ? DUMMY_COMPETITION : EMPTY_COMPETITION };
  }

  private persistMode(mode: CompetitionMode): void {
    localStorage.setItem(MODE_KEY, mode);
  }
}
