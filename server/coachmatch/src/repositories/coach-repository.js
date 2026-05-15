import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../config.js";
import { DatabaseConnectionException } from "../exceptions/DatabaseConnectionException.js";

const docClient = await createClient();

export default async function insertCoach (coachAttributes){
  try{
    const response = await docClient.send(new PutCommand(coachAttributes));
  }catch(err){
    if(err instanceof DatabaseConnectionException){
      throw new Error("Banco indisponivel", {cause:err});
    }
    throw err;
  }
}

export async function findCoachById(coachId){
  try{
    const params = {
      TableName:"coaches",
      Key:{
        coachId:coachId
      }
    }
    const response = (await docClient).send(new GetCommand(params))
    return response.Item
  }catch(err){
    throw new Error("Erro ao tentar localizar Coach",{cause:err});
  }
}