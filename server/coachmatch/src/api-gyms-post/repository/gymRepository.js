import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { createClient } from "../../shared/config.js"

const docClient = await createClient();

const buildPostParams = (gym) => {
  const id = uuidv4();
  return {
    TableName: "gyms",
    Item: {
      gymId: id,
      name: gym.name,
      address: gym.address,
      city: gym.city,
      state: gym.state,
      neighborhood: gym.neighborhood,
      coordinates: {
        lat: gym.coordinates.lat,
        lng: gym.coordinates.lng,
      },
    },
  };
};


export const insertSuggestGym = async (gym) => {
    try {
        const response = await docClient.send(new PutCommand(buildPostParams(gym)));
        return response;
    } catch (error) {
        throw error;
    }
}