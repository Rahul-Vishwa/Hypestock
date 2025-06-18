
import { AreaSeries, createChart, ColorType } from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface DataPoint {
  time: Time;
  value: number;
}

interface Props {
  data: DataPoint[],
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
  };
};

export const Chart: React.FC<Props> = ({
  data,
  colors: {
    backgroundColor = '#0a0b0b',
    lineColor = '#2962FF',
    textColor = 'white',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
  } = {},
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(
      () => {
          const handleResize = () => {
              chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
          };

          const chart = createChart(chartContainerRef.current!, {
              layout: {
                  background: { type: ColorType.Solid, color: backgroundColor },
                  textColor,
              },
              width: chartContainerRef.current!.clientWidth,
              height: 300,
              grid: {
                vertLines: {
                  color: 'transparent',
                },
                horzLines: {
                  color: 'transparent',
                },
              },
          });
          chart.timeScale().fitContent();
          chart.timeScale().applyOptions({
            timeVisible: true,
            secondsVisible: true,
          });

          const newSeries = chart.addSeries(AreaSeries, { lineColor, topColor: areaTopColor, bottomColor: areaBottomColor });
          newSeries.setData(data);

          window.addEventListener('resize', handleResize);

          return () => {
              window.removeEventListener('resize', handleResize);

              chart.remove();
          };
      },
      [data, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor]
  );

  return (
    <div className='border border-white rounded-md overflow-hidden px-5 py-5'>
      <div
        ref={chartContainerRef}
      />
    </div>
  );
};