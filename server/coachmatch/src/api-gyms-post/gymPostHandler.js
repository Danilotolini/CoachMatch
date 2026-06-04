import { registerSuggest } from "./service/service-gym.js";

export const handler = async (event) => {
   if(event?.body){
       const body = JSON.parse(event.body);
        await registerSuggest(body);
        return event.body;
   }else{
    throw new Error("Evento errado");
   }
}