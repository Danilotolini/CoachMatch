import Joi from "joi";
import schema from "../schemas/coaches.js";

const validateMiddleware = (req,res,next) => {
    try{
        if(schema.validate(req.body)){
            next()
        }else{
            res.send("campo errado");
        }
    }catch(err){
        console.log(err)
        throw err
    }

}
export default validateMiddleware;
