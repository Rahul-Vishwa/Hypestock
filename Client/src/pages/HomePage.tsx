import { Routes, Route } from "react-router-dom";
import Trade from "./Trade";
import AllEvents from "./AllEvents";
import Header from "../components/Header";
import FloatingBar from "../components/FloatingBar";
import CreateEvent from "./CreateEvent";
import Balance from "./Balance";

export default function HomePage() {
    return (
        <div className='bg-primary h-screen overflow-y-scroll text-white'>
            <Header></Header>
            <div className="px-52 py-10">
                <Routes>
                    <Route path='/' element={<AllEvents />}></Route>
                    <Route path='/createEvent' element={<CreateEvent />}></Route>
                    <Route path='/trade/:id' element={<Trade />}></Route>
                    <Route path='/payment' element={<Balance />}></Route>
                </Routes>
            </div>
            <FloatingBar />
        </div>
    );
}