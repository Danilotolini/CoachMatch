import { getGyms } from './service/gyms.service.js';

function mapGym(gym) {
  const { gymId, ...rest } = gym;
  return { id: gymId, ...rest };
}

export const handler = async (event) => {
  const params = event?.queryStringParameters ?? {};
  const limit = params.limit ? Number(params.limit) : 20;
  const cursor = params.cursor ?? undefined;

  const result = await getGyms({ limit, cursor });

  return {
    statusCode: 200,
    body: JSON.stringify({
      items: result.items.map(mapGym),
      nextCursor: result.nextCursor,
    }),
  };
};
