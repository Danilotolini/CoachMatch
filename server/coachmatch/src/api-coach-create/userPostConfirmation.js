import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import coachSchema from "../validation/validation-coach.js";
import insertCoach from "../repositories/coach-repository.js";
import { createCoach } from "../services/createCoach.js";

export const handler = async (event) =>{
  if(event?.request?.userAttributes){
    const userAttributes = event.request.userAttributes;
    await createCoach(userAttributes);
    return "Usuário Cadastrado";
  }
  else{
    throw Error("Evento com formato inválido");
  }

}