import { EventAndHeatDto, LaneDto } from './api.models';
import { Competition, Heat, Lane, Pool, SwimEvent } from '../models/domain.models';

export function mapEventAndHeat(dto: EventAndHeatDto): Competition {
  const currentEvent: SwimEvent | null = dto.event
    ? {
        number: dto.event,
        stroke: dto.stroke ?? '',
        category: dto.category ?? '',
        distance: dto.distance ?? '',
        heats: [],
        countHeats: dto.countHeats,
      }
    : null;

  const currentHeat: Heat | null = dto.heat
    ? { number: dto.heat, splashHeatId: dto.splashHeatId }
    : null;

  const pool: Pool = {
    lanes: (dto.lanes ?? []).map((l, i) => mapLane(l, i)),
  };

  return { currentEvent, currentHeat, pool };
}

function mapLane(dto: LaneDto, index: number): Lane {
  return {
    number: dto.laneId ?? index + 1,
    swimmerName: dto.displayName ?? '',
    club: dto.club ?? '',
    nat: dto.nat ?? '',
    entryTime: dto.entryTime ?? null,
    officialTime: dto.officialTime ?? null,
    time: null,
    rank: dto.rank ?? null,
    timestamp: null,
  };
}
