const { CognitoJwtVerifier } = require('aws-jwt-verify');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse:   'access',
  clientId:   process.env.COGNITO_CLIENT_ID,
});

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  try {
    const payload = await verifier.verify(authHeader.split(' ')[1]);
    req.user = {
      sub:      payload.sub,
      email:    payload.email,
      username: payload['cognito:username'],
      groups:   payload['cognito:groups'] || [],
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

module.exports = { auth };