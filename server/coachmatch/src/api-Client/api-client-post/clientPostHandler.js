import { createClient } from "../../shared/config.js";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { validateStudent } from "./validation/validation.js";


export const handler = async (event) => {
  if (!event?.requestContext?.authorizer?.jwt?.claims?.sub) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  const studentId = event.requestContext.authorizer.jwt.claims.sub;
  const body = JSON.parse(event.body);

  try {
    const response = await updateStudent(studentId, body);
    return {
      statusCode: 200,
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export const updateStudent = async (studentId, student) => {
  const { error } = validateStudent(student);
  if (error) {
    throw new Error(`Atributos inválidos: ${error.message}`);
  }

  return await update(studentId, student);
};

const buildUpdateParams = (studentId, student) => ({
  TableName: "student",
  Key: {
    studentId,
  },
  UpdateExpression:
    "SET #phone = :phone, #birthDate = :birthDate, #gender = :gender, #cep = :cep, #city = :city, #state = :state, #radius = :radius, #goal = :goal",
  ExpressionAttributeNames: {
    "#phone": "phone",
    "#birthDate": "birthDate",
    "#gender": "gender",
    "#cep": "cep",
    "#city": "city",
    "#state": "state",
    "#radius": "radius",
    "#goal": "goal",
  },
  ExpressionAttributeValues: {
    ":phone": student.phone,
    ":birthDate": student.birthDate,
    ":gender": student.gender,
    ":cep": student.cep,
    ":city": student.city,
    ":state": student.state,
    ":radius": student.radius,
    ":goal": student.goal,
  },
});

export const update = async (studentId, student) => {
  const docClient = await createClient();
  const params = buildUpdateParams(studentId, student);
  const response = await docClient.send(new UpdateCommand(params));
  return response;
};
