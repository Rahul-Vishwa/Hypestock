import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Callback from './pages/Callback';
import HomePage from './pages/HomePage';
import ProtectedRoute from './pages/ProtectedRoute';
import Payment from './pages/Balance';

function App() {

  function Unauthorized(){
    return <div>Unauthorized</div>
  }

  return (
    <div className='bg-primary h-screen'>
      <Router>
        <Routes>

          <Route path='/' element={<LandingPage />}></Route>
          <Route path='/auth/callback' element={<Callback />}></Route>
          <Route path='/unauthorized' element={<Unauthorized />}></Route>
          
          <Route element={<ProtectedRoute />}>
            <Route path='/home/*' element={<HomePage />}></Route>
          </Route>

        </Routes>
      </Router>
    </div>
  )
}

export default App
