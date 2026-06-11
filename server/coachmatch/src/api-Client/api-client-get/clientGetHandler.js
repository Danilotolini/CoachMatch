import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";

export const handler = async (event) => {
    const studentId = event.requestContext.authorizer.jwt.claims.sub;
    const student = findStudentById(studentId);
    return (await student).Item;
}

const findStudentById  = async (studentId) =>{
    const params = {
        TableName: "student",
        Key: {
            studentId: studentId
        }
    }

    const docClient = await createClient()
    const response = await docClient.send(new GetCommand(params))

    return response
}