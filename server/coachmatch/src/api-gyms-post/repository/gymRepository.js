import { PutCommand } from "@aws-sdk/lib-dynamodb";

const docClient = await createClient();

const buildPostParams = (Attributes) => {
  const gym = {
    TableName: "gyms",
    Item: {
      name: gym.name,
      address: gym.address,
      city: gym.city,
      state: gym.state,
      neighborhood: gym.neighborhood,
      coordinates: {
        lat: gym.lat,
        lng: gym.lng,
      },
    },
  };
};


export const insertSuggestGym = (gym) => {
    try {
        const reponse = await docClient.send(new PutCommand(buildPostParams(gym)))
    } catch (error) {
        
    }
}