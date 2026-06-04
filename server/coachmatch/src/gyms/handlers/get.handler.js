import { getGyms } from '../service/gyms.service.js';

export const handler = async (event) => {
  const params = event?.queryStringParameters ?? {};
  const limit = params.limit ? Number(params.limit) : 20;
  const cursor = params.cursor ?? undefined;

  const result = await getGyms({ limit, cursor });

  return { statusCode: 200, body: JSON.stringify(result) };
};
