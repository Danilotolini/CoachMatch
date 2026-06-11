import { getCoach, updateCoachProfile } from '../service/coaches.service.js';

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

function buildWorkLocation(body) {
  if (body.territory === 'GYMS') {
    const gymIds = Array.isArray(body.gyms) ? body.gyms : [];
    return gymIds.map((gymId) => ({ type: 'GYM', gymId }));
  }
  if (body.territory === 'HOME_SERVICE') {
    return [{ type: 'HOME_SERVICE', serviceRadius: body.serviceRadius ?? 10 }];
  }
  return [];
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

  const cref = body.cref?.startsWith('CREF ') ? body.cref : `CREF ${body.cref ?? ''}`;
  const instagram = body.instagram?.startsWith('@') ? body.instagram : `@${body.instagram ?? ''}`;

  const servicePayload = {
    profile: {
      name: body.name ?? current.profile?.name ?? '',
      phone: body.phone ?? '',
      specialties: body.specialties ?? [],
      cref,
      instagram,
      profile_video: body.profileVideo ?? false,
    },
    work_location: buildWorkLocation(body),
  };

  const newStatus = current.status === 'PENDING_PROFILE' ? 'PENDING_REVIEW' : current.status;

  await updateCoachProfile(coachId, servicePayload, newStatus);

  const updated = await getCoach(coachId);
  return { statusCode: 200, body: JSON.stringify(mapToCoachMe(updated)) };
};
