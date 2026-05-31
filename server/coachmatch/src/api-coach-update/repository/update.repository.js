import { UpdateCommand } from "@aws-sdk/lib-dynamodb"; 
import { createClient } from "../../config.js";

const buildUpdateParams = (coachId, coach) => ({
  TableName: "coaches",
  Key: {
    coachId: coachId,
  },
  UpdateExpression: "SET #profile = :profile, #work_location = :work_location",
  ExpressionAttributeNames: {
    "#profile": "profile",
    "#work_location": "work_location",
  },
  ExpressionAttributeValues: {
    ":profile": coach.profile,
    ":work_location": coach.work_location,
  },
});

export const update = async (coachId, coach) => {
  const docClient = await createClient();
  const params = buildUpdateParams(coachId, coach);
  const response = await docClient.send(new UpdateCommand(params));
  return response;
};