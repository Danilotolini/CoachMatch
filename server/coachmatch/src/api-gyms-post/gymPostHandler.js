export const handler = (event) => {
   if(event?.body){
        await registerSuggest(event.body);
        return event.body;
   }else{
    throw new Error("Evento errado");
   }

}