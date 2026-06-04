export const handler = async (event) => {
    if(event?.queryStringParameters){
        console.log(event.queryStringParameters);
        const gyms = await getGyms(page,limit);
    }
    return event;
};