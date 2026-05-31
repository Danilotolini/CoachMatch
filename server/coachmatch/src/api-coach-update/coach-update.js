import { updateCoach } from "./service/updateCoach.js";


export const handler = async (event) => {
  console.log("passei auqi");
  if (event?.requestContext?.authorizer?.jwt?.claims?.sub) {
    const coachId = event.requestContext.authorizer.jwt.claims.sub;
    const body = JSON.parse(event.body);
  
    await updateCoach(coachId, body)
  } else {
    
  }
  return event;
};
