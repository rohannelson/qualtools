import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { IdPair, Point, Row } from "./types";
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
  selectedIds,
  setSelectedIds,
}: {
  parsedText: Row[];
  selectedIds: Set<IdPair>;
  setSelectedIds: Dispatch<SetStateAction<Set<IdPair>>>;
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
        toggleSelection({ id: point.id, sentenceIndex: point.sentenceIndex });
      }
    } else {
      // Drag selection
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const startX = xScale.getValueForPixel(dragRect.x);
      const endX = xScale.getValueForPixel(dragRect.x + dragRect.width);
      const startY = yScale.getValueForPixel(dragRect.y + dragRect.height); // inverted
      const endY = yScale.getValueForPixel(dragRect.y);

      const selected = parsedText.filter(
        (p) =>
          p?.coords &&
          p.coords.x >= Math.min(startX, endX) &&
          p.coords.x <= Math.max(startX, endX) &&
          p.coords.y >= Math.min(startY, endY) &&
          p.coords.y <= Math.max(startY, endY)
      );

      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        selected.forEach((p) =>
          newSet.add({ id: p.id, sentenceIndex: p.sentenceIndex })
        );
        return newSet;
      });
    }

    setDragStart(null);
    setDragRect(null);
  }

  // --- Selection helpers ---
  function toggleSelection({
    id,
    sentenceIndex,
  }: {
    id: number;
    sentenceIndex: number;
  }) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has({ id, sentenceIndex }))
        newSet.delete({ id, sentenceIndex });
      else newSet.add({ id, sentenceIndex });
      return newSet;
    });
  }

  const xs = parsedText.map((p) => p?.coords?.x ?? 0);
  const ys = parsedText.map((p) => p?.coords?.y ?? 0);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const data = {
    datasets: [
      {
        label: "2D Embeddings",
        data: parsedText.map((p) => ({
          x: p?.coords?.x,
          y: p?.coords?.y,
          id: p.id,
          text: p.text,
        })),
        backgroundColor: parsedText.map((p) =>
          selectedIds.has({ id: p.id, sentenceIndex: p.sentenceIndex })
            ? "#FF5733"
            : "#8884d8"
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
      {parsedText.length > 0 && (
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
