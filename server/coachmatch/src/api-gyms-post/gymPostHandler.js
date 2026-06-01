import { registerSuggest } from "./service/service-gym.js";

export const handler = async (event) => {
   if(event?.body){
        await registerSuggest(event.body);
        return event.body;
   }else{
    throw new Error("Evento errado");
   }
}