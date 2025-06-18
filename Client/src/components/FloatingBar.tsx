import { Link } from 'react-router-dom';
export default function FloatingBar() {
    return <div className="flex gap-3 rounded-sm fixed bottom-5 left-10 bg-secondary py-3 px-3">
        <Link to='/home/createEvent'>
            <button className="button-white">Create Event</button>
        </Link>
        <Link to='/home'>
            <button className="button-white">All Events</button>
    </Link>
        <Link to='/home/payment'>
            <button className="button-white">Balance</button>
        </Link>
    </div>
}