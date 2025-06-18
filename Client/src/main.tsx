import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain="codeaux.us.auth0.com"
      clientId="1fl0gGRv1Bxm0onMMX5Etbk4ODu2bJQK"
      authorizationParams={{
        redirect_uri: 'https://dev.hypestock.local/auth/callback',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE
      }}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
