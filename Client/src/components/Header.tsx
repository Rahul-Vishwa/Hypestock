import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";

export default function Header() {
  const { logout, isAuthenticated, user, loginWithRedirect } = useAuth0();
  const [name, setName] = useState<string>();
  const [loggedIn, setLoggedIn] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated){
      setName(user?.name!);
    }
  }, [isAuthenticated]);

  function handleLoginClick() {
    setLoggedIn(true);
    loginWithRedirect();
  }

  return (
    <div className='flex justify-between px-10 py-5'>
      <div className='flex flex-col justify-center text-xl font-bold text-[#EEEEEE]'>
        Hypestock
      </div>
      <div>
        {
          isAuthenticated && loggedIn ?
          <div className="flex gap-8 items-center">
            <div>
              {name}
            </div>
            <button onClick={() => logout()} className='button'>
              Log Out
            </button> 
          </div> :
          <button onClick={handleLoginClick} className='button'>
            Log In
          </button>
        }
      </div>
    </div>
  )
}