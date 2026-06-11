import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { createClient } from "../../shared/config.js";
import alunoValidation from "./validation/validationAluno.js";


const docClient = await createClient();


export const createAluno = async (userAttributes) =>{
    isAlunoFieldsValid(userAttributes);
    const aluno = fromCognitoAttributesToAluno(userAttributes);
    await inserAluno(aluno);
}

const isAlunoFieldsValid = (userAttributes) => {
    const { error } = alunoValidation.validate(userAttributes);
    console.log(userAttributes);
    if(error){
      throw new Error(`Atributos Inválidos ${error.message}`,{cause:error});
    }
}

function fromCognitoAttributesToAluno(userAttributes) {
const alunoAttributes = {
     TableName:"student",
      Item:{
        studentId:userAttributes.sub,
        email:userAttributes.email,
        status:"ONBOARDING_PROFILE",
        profile:{
          name: userAttributes.name
        }
      }
    }
    return alunoAttributes;
}

export default async function inserAluno (userAttributes){
  try{
    const response = await docClient.send(new PutCommand(userAttributes));
  }catch(err){
    throw err;
  }
}