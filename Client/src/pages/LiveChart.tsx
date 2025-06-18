import { useEffect, useState } from "react";
import { onPriceChange } from "../lib/socket";
import { Chart } from "../components/Chart";
import api from "../api/axios";
import type { Time } from "lightweight-charts";

interface PricePoint {
    time: Time;
    value: number;
}

export default function LiveChart({eventId}: { eventId: string }){
    const [chartData, setChartData] = useState<PricePoint[]>([]);
    let isSet = false;

    useEffect(() => {
        if (!isSet) {
            api.get<{ prices: PricePoint[] }>('/order/prices', {
                params: {
                    eventId
                }
            })
            .then(({data}) => {
                setChartData(data.prices);
            })
            .catch(error => {
                console.log(error);
            });
            onPriceChange((data: PricePoint) => {
                setChartData(prev => [...prev, data]);
            });
        }

        return () => {
            isSet = true;
        }
    }, []);

    return (
        <div>
            <Chart data={chartData}></Chart>
        </div>
    );
}