import jwt from "jsonwebtoken";

//COGNITO - jwt verification - qual a diferença dele normal nesse caso
// import { CognitoJwtVerifier } from "aws-jwt-verify";
// const verifier = CognitoJwtVerifier.create({
//     userPoolId:"sa-east-1_2DDuPPtc0",
//     tokenUse:"id",
//     clientId:"76hul7797npfkmpoju0mbghti7",
// })

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "minha-chave-secreta-de-teste");

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

export default authMiddleware;
