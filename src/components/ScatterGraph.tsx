import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Point, Row } from "./types";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ScatterController, LinearScale, PointElement, Tooltip, Legend);

export default function ScatterGraph({
  parsedText,
  embeddings2D,
  selectedIds,
  setSelectedIds,
}: {
  parsedText: Row[];
  embeddings2D: Point[];
  selectedIds: Set<number>;
  setSelectedIds: Dispatch<SetStateAction<Set<number>>>;
}) {
  interface DragRect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  const chartRef = useRef<any>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragRect, setDragRect] = useState<DragRect | null>(null);

  const DRAG_THRESHOLD = 5;

  // --- Mouse Handlers ---
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    setDragStart({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    setDragRect(null);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragStart) return;

    const dx = e.nativeEvent.offsetX - dragStart.x;
    const dy = e.nativeEvent.offsetY - dragStart.y;

    if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

    const x = Math.min(dragStart.x, e.nativeEvent.offsetX);
    const y = Math.min(dragStart.y, e.nativeEvent.offsetY);
    const width = Math.abs(dx);
    const height = Math.abs(dy);

    setDragRect({ x, y, width, height });
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    const chart = chartRef.current;
    if (!chart) return;

    if (!dragRect) {
      // Click selection
      const elements = chart.getElementsAtEventForMode(
        e.nativeEvent,
        "nearest",
        { intersect: true },
        true
      );
      if (elements.length) {
        const point: any = elements[0].element.$context.raw;
        toggleSelection(point.id);
      }
    } else {
      // Drag selection
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const startX = xScale.getValueForPixel(dragRect.x);
      const endX = xScale.getValueForPixel(dragRect.x + dragRect.width);
      const startY = yScale.getValueForPixel(dragRect.y + dragRect.height); // inverted
      const endY = yScale.getValueForPixel(dragRect.y);

      const selected = embeddings2D.filter(
        (p) =>
          p.x >= Math.min(startX, endX) &&
          p.x <= Math.max(startX, endX) &&
          p.y >= Math.min(startY, endY) &&
          p.y <= Math.max(startY, endY)
      );

      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        selected.forEach((p) => newSet.add(p.id));
        return newSet;
      });
    }

    setDragStart(null);
    setDragRect(null);
  }

  // --- Selection helpers ---
  function toggleSelection(id: number) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  const xs = embeddings2D.map((p) => p.x);
  const ys = embeddings2D.map((p) => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const data = {
    datasets: [
      {
        label: "2D Embeddings",
        data: embeddings2D.map((p) => ({
          x: p.x,
          y: p.y,
          id: p.id,
          text: p.text,
        })),
        backgroundColor: embeddings2D.map((p) =>
          selectedIds.has(p.id) ? "#FF5733" : "#8884d8"
        ),
        pointRadius: 5,
      },
    ],
  };

  const buffer = 0.05; // 5% buffer
  const xRange = maxX - minX;
  const yRange = maxY - minY;

  const options: any = {
    animation: false,
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const p = ctx.raw;
            return `ID: ${p.id}\nText: ${p.text}`;
          },
        },
      },
    },
    scales: {
      x: {
        min: minX - xRange * buffer,
        max: maxX + xRange * buffer,
      },
      y: {
        min: minY - yRange * buffer,
        max: maxY + yRange * buffer,
      },
    },
  };

  return (
    <>
      {embeddings2D.length > 0 && (
        <>
          <h2 className="font-semibold mb-2">2D Embedding Scatterplot</h2>
          <div className="relative w-full h-[calc(100%-1.5rem)]">
            <div
              className="absolute top-0 left-0 w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Scatter ref={chartRef} data={data} options={options} />
              {dragRect && (
                <div
                  className="absolute bg-blue-200 border border-blue-600 opacity-50"
                  style={{
                    left: dragRect.x,
                    top: dragRect.y,
                    width: dragRect.width,
                    height: dragRect.height,
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
