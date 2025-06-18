import { useEffect, useState } from "react";
import { onEventEnd, onEventStart, onOrderBook } from "../lib/socket";
import api from "../api/axios";

type OrderBook = {
    [price: number]: {
        quantity: number,
        side: 'bid' | 'ask'
    }
};

type OrderBookArr = [string, {
    quantity: number;
    side: "bid" | "ask";
}][];

export default function OrderBook() {
    const [orderBook, setOrderBook] = useState<OrderBookArr | null>(null);
    
    useEffect(() => {
        onOrderBook((orderBook: OrderBook) => {
            const orderBookArr = Array.from(Object.entries(orderBook));
            setOrderBook(orderBookArr);
        });
    }, []);

    return (
        <div className="mt-5">
            <div className="text-[12px] rounded-md w-full">
                <table className="w-full">
                    <thead>
                        <tr>
                            <td className="px-2 py-1">Price</td>
                            <td className="text-center px-2 py-1">Qty.</td>
                            <td className="text-end px-2 py-1">Type</td>
                        </tr>
                    </thead>
                    <tbody>
                        {orderBook && orderBook.map((order) => (
                            <tr key={order[0]} className={`${order[1].side === 'bid' ? 'bg-[#2962FF]' : 'bg-[#9928d1]'} text-white`}>
                                <td className="px-2 py-1">
                                    {order[0]}
                                </td>
                                <td className="text-center px-2 py-1">
                                    {order[1].quantity}
                                </td>
                                <td className="text-end px-2 py-1">
                                    {order[1].side}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}