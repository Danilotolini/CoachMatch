import { withLogger } from '../../shared/logger.js';
import { getCoachDetail } from "./index.js";
import { NotFoundException } from "../../shared/exceptions.js";

const _handler = async (event) => {
  const coachId = event?.pathParameters?.coachId;

  if (!coachId) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "coachId é obrigatório" }),
    };
  }

  try {
    const coach = await getCoachDetail(coachId);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coach),
    };
  } catch (err) {
    if (err instanceof NotFoundException) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: err.message }),
      };
    }

    console.error("[handler] erro inesperado:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Erro interno" }),
    };
  }
};
export const handler = withLogger(_handler);
