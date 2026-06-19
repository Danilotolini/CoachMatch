import { findCoachById, loadGyms } from "./repository.js";
import { NotFoundException } from "../../shared/exceptions.js";
import { signGetUrl } from "../../shared/s3.js";

const SEARCHABLE_STATUS = "APPROVED";

export async function getCoachDetail(coachId) {
  const coach = await findCoachById(coachId);

  if (!coach || coach.status !== SEARCHABLE_STATUS) {
    throw new NotFoundException("Treinador", coachId);
  }

  const gymsById = await loadGyms(collectGymIds(coach));

  return mapCoach(coach, gymsById);
}

function collectGymIds(coach) {
  return (coach.work_location ?? [])
    .filter((loc) => loc.type === "GYM" && loc.gymId)
    .map((loc) => loc.gymId);
}

async function mapCoach(coach, gymsById) {
  const [photo_url, video_url] = await Promise.all([
    signGetUrl(coach.profile?.photo_key),
    signGetUrl(coach.profile?.video_key),
  ]);

  return {
    coachId: coach.coachId ?? null,
    status: coach.status ?? null,
    profile: {
      name:        coach.profile?.name        ?? null,
      phone:       coach.profile?.phone        ?? null,
      specialties: coach.profile?.specialties  ?? [],
      cref:        coach.profile?.cref         ?? null,
      instagram:   coach.profile?.instagram    ?? null,
      photo_url,
      video_url,
    },
    work_location: mapWorkLocations(coach.work_location ?? [], gymsById),
  };
}

function mapWorkLocations(locations, gymsById) {
  return locations.map((loc) => {
    if (loc.type === "GYM") {
      const gym = loc.gymId ? gymsById.get(loc.gymId) : null;
      return {
        type: "GYM",
        gymId: loc.gymId ?? null,
        gym: gym
          ? {
              name:         gym.name         ?? null,
              neighborhood: gym.neighborhood ?? null,
              city:         gym.city         ?? null,
              state:        gym.state        ?? null,
            }
          : null,
      };
    }

    if (loc.type === "HOME_SERVICE") {
      return {
        type: "HOME_SERVICE",
        coverage: {
          city:          loc.coverage?.city          ?? null,
          state:         loc.coverage?.state         ?? null,
          neighborhoods: loc.coverage?.neighborhoods ?? [],
        },
      };
    }

    return loc;
  });
}
