import { ListTablesCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "local",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "FAKEID123", 
    secretAccessKey: "FAKESECRET123"
  }
});

const docClient = DynamoDBDocumentClient.from(client)


const testeDbConnection = async(coach) =>{
    console.log("valor do coach",coach)
    const command = new ListTablesCommand({})

    //usado para validar se a tabela esta sendo criada
    //const response = await client.send(command)
    //console.log(response.TableNames.join("\n"))
    
    const response = await insertCoach(coach);
    await readCoach(coach.coachId)

    return response
}


const insertCoach = async(coach) =>{
    const params = {
        TableName:"coaches",
        Item:{
            coachId: coach.coachId,
            email: coach.email,
            status: coach.status
        }
    }

    const data = await client.send(new PutCommand(params))
    return data.$metadata.httpStatusCode;
}

const readCoach = async(coachId) => {
    const params = {
        TableName:"coaches",
        Key:{
            coachId: coachId
        }
    }
    const data = await docClient.send(new GetCommand(params))

    console.log('valor do coach no dynamo : ' + JSON.stringify(data));
}

export default testeDbConnection
