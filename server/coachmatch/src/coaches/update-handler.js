import { getCoach, updateCoachProfile } from './service/coaches.service.js';

function mapToCoachMe(coach) {
  const profile = coach.profile ?? {};

  return {
    profile: {
      name: profile.name ?? null,
      phone: profile.phone ?? null,
      instagram: profile.instagram ?? null,
      cref: profile.cref ?? null,
      profile_photo: profile.profile_photo ?? null,
      profile_video: profile.profile_video ?? null,
      specialties: profile.specialties ?? [],
    },
    work_location: (coach.work_location ?? []).map((loc) => {
      if (loc.type === 'GYM') {
        return { type: 'GYM', gymId: loc.gymId };
      }
      if (loc.type === 'HOME_SERVICE') {
        return {
          type: 'HOME_SERVICE',
          coverage: {
            city: loc.coverage?.city ?? null,
            state: loc.coverage?.state ?? null,
            neighborhoods: loc.coverage?.neighborhoods ?? [],
          },
        };
      }
      return loc;
    }),
  };
}

export const handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;

  const current = await getCoach(coachId);
  if (!current) {
    return { statusCode: 404, body: JSON.stringify({ message: 'Coach não encontrado' }) };
  }

  const servicePayload = {
    profile: body.profile,
    work_location: body.work_location,
  };

  console.log('servicePayload:', JSON.stringify(servicePayload));

  const newStatus = current.status === 'PENDING_PROFILE' ? 'PENDING_REVIEW' : current.status;
  await updateCoachProfile(coachId, servicePayload, newStatus);

  const updated = await getCoach(coachId);
  return { statusCode: 200, body: JSON.stringify(mapToCoachMe(updated)) };
};