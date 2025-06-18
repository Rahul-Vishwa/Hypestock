"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtCheck = void 0;
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
exports.jwtCheck = (0, express_oauth2_jwt_bearer_1.auth)({
    audience: 'https://api.hypestock.local/',
    issuerBaseURL: 'https://codeaux.us.auth0.com/',
    tokenSigningAlg: 'RS256'
});
