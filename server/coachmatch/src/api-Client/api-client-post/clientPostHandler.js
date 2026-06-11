export const handler = async (event) => {
    if(event?.requestContext?.authorizer?.jwt.claims.sub){
        const clientId = event.requestContext.authorizer.jwt.claims.sub;
        const body = JSON.parse(body);
        await updateAluno(clientId,body);
    }
    return event;
}

