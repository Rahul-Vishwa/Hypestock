import { LocalStorageCache, useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useEffect } from "react";

export default function Callback() {
    const apiUrl = import.meta.env.VITE_API_URL;
    const navigate = useNavigate();
    const { isAuthenticated, user, isLoading, getAccessTokenSilently } = useAuth0();

    
    useEffect(() => {
        if (isLoading) return;

        async function handleAuth() {
            if (!isAuthenticated){
                navigate('/unauthorized');
                return;
            }
            const token = await getAccessTokenSilently();
            localStorage.setItem('token', token);

            api.post(`/user`, {
                email: user?.email,
                nickName: user?.given_name,
                name: user?.name,
            }, {
                withCredentials: true
            })
            .then(async () => {
                navigate('/home');
            })
            .catch((error) => {
                console.log(error);
                navigate('/unauthorized');
            });
        }

        handleAuth();
    }, [isAuthenticated, isLoading]);
    
    // TODO: Replace this with loader
    return <div>Loading</div>;
}