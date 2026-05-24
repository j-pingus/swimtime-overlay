export interface StatusDto {
  status?: string;
}

export interface UpdateCompetitionDto {
  status?: string;
}

export interface OfficialDto {
  heat?: string;
  lane?: number;
  rank?: number;
  time?: string;
  status?: string;
}

export interface DummyOfficialsDto {
  status?: string;
  officials?: OfficialDto[];
}

export interface OfficialsDto {
  officials?: OfficialDto[];
}

export interface SwimmerDto {
  id?: number;
  fullname?: string;
  firstname?: string;
  lastname?: string;
  birthdate?: string;
  gender?: string;
  nation?: string;
  club?: string;
}

export interface SwimmersDto {
  swimmers?: SwimmerDto[];
}

export interface SwimmerLane {
  lane?: number;
  name?: string;
}

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

export interface EventAndHeatDto {
  event?: string;
  heat?: string;
  isFinished?: boolean;
  stroke?: string;
  category?: string;
  distance?: string;
  startTime?: number;
  lanes?: LaneDto[];
}

export interface EventDto {
  number?: string;
  distance?: string;
  stroke?: string;
  category?: string;
  gender?: string;
  agegroup?: string;
}

export interface EventResponseDto {
  event?: EventDto;
}

export interface CurrentHeatDto {
  eventNumber?: string;
  heatNumber?: string;
  startTime?: string;
  isFinished?: boolean;
  swimmers?: SwimmerLane[];
  times?: string[];
  status?: string;
}

export interface CurrentEventDto {
  currentEvent?: string;
  currentHeat?: string;
  distance?: string;
  stroke?: string;
  category?: string;
  round_name?: string;
  status?: string;
}

export interface CompetitionSessionDto {
  number?: number;
  name?: string;
  date?: string;
  events?: string[];
}

export interface CompetitionInfoDto {
  name?: string;
  city?: string;
  nation?: string;
  sessions?: CompetitionSessionDto[];
}

export interface PoolSizeDto {
  pool_size?: number;
}

export interface StreamDeckInfoDto {
  event?: string;
  heat?: string;
  status?: string;
}
