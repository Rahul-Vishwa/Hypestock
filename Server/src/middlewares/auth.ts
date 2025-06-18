import { auth } from "express-oauth2-jwt-bearer";

export const jwtCheck = auth({
    audience: 'https://api.hypestock.local/',
    issuerBaseURL: 'https://codeaux.us.auth0.com/',
    tokenSigningAlg: 'RS256'
});