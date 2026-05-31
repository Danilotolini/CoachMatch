import coachSchema from "../validation/schemas.js";

export const validateCoach = (coach) => {
  return coachSchema.validate(coach);
}
