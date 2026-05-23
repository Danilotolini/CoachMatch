export const handler = async(event) =>{
    if(event?.body){
        updateCoach(event.body);
    }
    return event;    
}