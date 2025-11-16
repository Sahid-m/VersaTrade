'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData as LightweightCandlestickData, LineStyle, type Time, type IPriceLine, type MouseEventParams } from 'lightweight-charts';
import { type CandlestickData, type Point, type DrawnLine, type DrawnHorizontalLine, type DrawnArrowMarker } from '@/lib/types';
import { type DrawingTool } from './chart-toolbar';
import { nanoid } from 'nanoid';

interface TradingChartProps {
  data: CandlestickData[];
  showCandlesticks: boolean;
  drawingTool: DrawingTool;
  drawnLines: DrawnLine[];
  setDrawnLines: (lines: DrawnLine[]) => void;
  drawnHorizontalLines: DrawnHorizontalLine[];
  setDrawnHorizontalLines: (lines: DrawnHorizontalLine[]) => void;
  drawnArrowMarkers: DrawnArrowMarker[];
  setDrawnArrowMarkers: (markers: DrawnArrowMarker[]) => void;
}

const chartOptions = {
    layout: {
        background: { color: '#131722' },
        textColor: '#D9D9D9',
    },
    grid: {
        vertLines: {
            color: 'rgba(70, 130, 180, 0.5)',
            style: LineStyle.Dashed,
        },
        horzLines: {
            color: 'rgba(70, 130, 180, 0.5)',
             style: LineStyle.Dashed,
        },
    },
    crosshair: {
        mode: 1, // Magnet
    },
    rightPriceScale: {
        borderColor: '#71649C',
    },
    timeScale: {
        borderColor: '#71649C',
        timeVisible: true,
        secondsVisible: true,
    },
};

const candlestickSeriesOptions = {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderDownColor: '#ef5350',
    borderUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    wickUpColor: '#26a69a',
};

const lineSeriesOptions = {
    color: '#2962FF',
    lineWidth: 2,
};

export function TradingChart({ 
    data, 
    showCandlesticks, 
    drawingTool,
    drawnLines,
    setDrawnLines,
    drawnHorizontalLines,
    setDrawnHorizontalLines,
    drawnArrowMarkers,
    setDrawnArrowMarkers
}: TradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

    const [drawing, setDrawing] = useState(false);
    const [tempLine, setTempLine] = useState<DrawnLine | null>(null);
    const tempLineRef = useRef<IPriceLine | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;
        candlestickSeriesRef.current = chart.addCandlestickSeries(candlestickSeriesOptions);
        lineSeriesRef.current = chart.addLineSeries(lineSeriesOptions);
        
        const handleResize = () => {
            chart.resize(chartContainerRef.current!.clientWidth, chartContainerRef.current!.clientHeight);
        };
        
        const handleClick = (param: MouseEventParams) => {
            if (!param.point || !param.time) return;
            
            const price = candlestickSeriesRef.current!.coordinateToPrice(param.point.y)!;
            const time = param.time;

            if (drawingTool === 'trend-line') {
                if (!drawing) {
                    setDrawing(true);
                    setTempLine({ id: nanoid(), start: { time, price }, end: { time, price } });
                } else {
                    if (tempLine) {
                        setDrawnLines([...drawnLines, { ...tempLine, end: { time, price } }]);
                    }
                    setDrawing(false);
                    setTempLine(null);
                }
            } else if (drawingTool === 'horizontal-line') {
                 setDrawnHorizontalLines([...drawnHorizontalLines, { id: nanoid(), price }]);
            } else if (drawingTool === 'arrow-marker') {
                setDrawnArrowMarkers([...drawnArrowMarkers, { id: nanoid(), point: { time, price } }]);
            }
        };

        const handleCrosshairMove = (param: MouseEventParams) => {
             if (!drawing || !param.point || !param.time || !tempLine) return;
             
             const price = candlestickSeriesRef.current!.coordinateToPrice(param.point.y)!;
             const time = param.time;

             setTempLine({ ...tempLine, end: { time, price } });
        };

        chart.subscribeClick(handleClick);
        chart.subscribeCrosshairMove(handleCrosshairMove);

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);
        
        return () => {
            resizeObserver.disconnect();
            chart.unsubscribeClick(handleClick);
            chart.unsubscribeCrosshairMove(handleCrosshairMove);
            chart.remove();
        };
    }, [drawingTool, drawing, tempLine, drawnLines, drawnHorizontalLines, drawnArrowMarkers]);
    
    useEffect(() => {
        if (!chartRef.current || !candlestickSeriesRef.current || !lineSeriesRef.current) return;
        candlestickSeriesRef.current.applyOptions({ visible: showCandlesticks });
        lineSeriesRef.current.applyOptions({ visible: !showCandlesticks });
    }, [showCandlesticks]);

    useEffect(() => {
        if (!data || !candlestickSeriesRef.current || !lineSeriesRef.current) return;
        
        const formattedData = data.filter(Boolean).map(d => ({ ...d, time: d.time as any }));
        candlestickSeriesRef.current.setData(formattedData);
        lineSeriesRef.current.setData(formattedData.map(d => ({ time: d.time as any, value: d.close })));

    }, [data]);
    
     useEffect(() => {
        const series = candlestickSeriesRef.current;
        if (!series) return;
        
        // Clear previous lines
        if (tempLineRef.current) {
            series.removePriceLine(tempLineRef.current);
            tempLineRef.current = null;
        }
        drawnLines.forEach(line => {
             // This is a workaround as the library doesn't expose a way to remove lines by id
        });
        
        // Draw saved lines
        drawnLines.forEach(line => {
            // NOTE: lightweight-charts does not support trend lines directly. We simulate with price lines.
            // This is a simplified representation. For real trend lines, we'd need a plugin or canvas drawing.
            const startLine = series.createPriceLine({ price: line.start.price, color: 'orange', lineStyle: LineStyle.Solid, lineWidth: 1, axisLabelVisible: false });
            const endLine = series.createPriceLine({ price: line.end.price, color: 'orange', lineStyle: LineStyle.Solid, lineWidth: 1, axisLabelVisible: false });
        });
        
        // Draw temp line
        if (tempLine && drawing) {
             // As above, this is a simulation.
            tempLineRef.current = series.createPriceLine({ price: tempLine.end.price, color: 'rgba(255, 165, 0, 0.5)', lineStyle: LineStyle.Dashed, lineWidth: 1 });
        }

    }, [tempLine, drawing, drawnLines]);

    return (
        <div ref={chartContainerRef} className="w-full h-full min-h-[300px] md:min-h-full" />
    );
}