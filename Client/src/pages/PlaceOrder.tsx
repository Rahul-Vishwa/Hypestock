import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { onEventEnd, onEventStart } from "../lib/socket";
import api from "../api/axios";

interface Order {
    price: number;
    quantity: number;
};

export default function PlaceOrder({eventId}: { eventId: string }) {
    const [order, setOrder] = useState<Order>({
        price: 0,
        quantity: 0
    });
    const [isRunning, setIsRunning] = useState(false);
    const disabled = isRunning ? !order.price && !order.quantity : true;
    const priceInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        api.get<{ isRunning: boolean }>('/event/isRunning', {
            params: {
                eventId
            }
        })
        .then(({data}) => {
            setIsRunning(data.isRunning);
        })
        .catch(error => {
            console.log(error);
        });

        onEventStart(() => {
            setIsRunning(true);
        });
        onEventEnd(() => {
            setIsRunning(false);
        });
    }, []);

    function placeOrder(side: 'bid' | 'ask'){
        api.post<{ quantity: number }>('/order', {
            eventId,
            side,
            ...order
        })
        .then(({data}) => {
            setOrder({
                price: 0,
                quantity: 0
            });
            if (priceInputRef.current) {
                priceInputRef.current.value = '';
            }
            if (quantityInputRef.current) {
                quantityInputRef.current.value = '';
            }
        })
        .catch(error => {
            console.log(error);
        });
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        setOrder({
            ...order,
            [event.target.id]: Number(event.target.value)
        });
    }

    return (
        <div>
            <div className="flex justify-between gap-5">
                <div className="flex flex-col gap-1">
                    <label htmlFor='price'>Price</label>
                    <input 
                        id="price" 
                        type="number" 
                        className="w-full py-2 px-3 text-black rounded-sm outline-none" 
                        ref={priceInputRef}
                        onChange={handleInputChange}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor='quantity'>Quantity</label>
                    <input 
                        id="quantity" 
                        type="number" 
                        className="w-full py-2 px-3 text-black rounded-sm outline-none"
                        ref={quantityInputRef}
                        onChange={handleInputChange}
                    />
                </div>
            </div>
            <div className="flex justify-between gap-5 mt-5">
                <button 
                    className={`rounded-sm w-full py-2 bg-white text-black text-[12px] ${disabled && 'bg-secondary'}`}
                    disabled={disabled}
                    onClick={() => placeOrder('bid')}
                >
                    Buy
                </button>
                <button 
                    className={`rounded-sm w-full py-2 bg-white text-black text-[12px] ${disabled && 'bg-secondary'}`}
                    disabled={disabled}
                    onClick={() => placeOrder('ask')}
                >
                    Sell
                </button>
            </div>
        </div>
    );
}