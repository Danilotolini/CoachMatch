import { getCoach } from './service/coaches.service.js';

function mapToCoachMe(coach) {
  const profile = coach.profile ?? {};
  const locations = coach.work_location ?? [];
  const gyms = locations.filter((l) => l.type === 'GYM');
  const homeService = locations.find((l) => l.type === 'HOME_SERVICE');

  const statusMap = { PENDING_PROFILE: 'PROFILE_INCOMPLETE' };
  const status = statusMap[coach.status] ?? coach.status;

  return {
    email: coach.email,
    name: profile.name ?? null,
    phone: profile.phone ?? null,
    instagram: profile.instagram ?? null,
    cref: profile.cref ?? null,
    profilePhoto: profile.profile_photo ?? null,
    profileVideo: profile.profile_video ?? null,
    specialties: profile.specialties ?? [],
    territory: gyms.length > 0 ? 'GYMS' : homeService ? 'HOME_SERVICE' : null,
    gyms: gyms.map((l) => l.gymId),
    serviceRadius: homeService?.serviceRadius ?? null,
    status,
    rejectionReason: coach.rejection_reason ?? null,
  };
}

export const handler = async (event) => {
  const coachId = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!coachId) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Não autorizado' }) };
  }

  const coach = await getCoach(coachId);
  if (!coach) {
    return { statusCode: 404, body: JSON.stringify({ message: 'Coach não encontrado' }) };
  }

  return { statusCode: 200, body: JSON.stringify(mapToCoachMe(coach)) };
};
