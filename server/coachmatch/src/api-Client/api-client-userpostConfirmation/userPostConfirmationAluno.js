import { createClient } from "../../shared/config.js";
import { createAluno } from "./createClient.js";

export const handler = async (event) => {
    if(event?.request?.userAttributes){
        const userAttributes = event.request.userAttributes;
        await createAluno(userAttributes);
        return "Usuário Cadastrado";
    }
    else{
        throw Error("Evento com formato inválido");
      }
}