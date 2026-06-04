import { createClient } from "../../config"

const docClient = createClient();

export const getGymsRepository = async (page,limit) => {


}

const buildParams = async (page,limit) =>{

    const params = {
        TableName:"gyms",
        
    }
}