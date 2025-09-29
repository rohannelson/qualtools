import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Row } from "./types";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ScatterController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { oneToHex } from "../lib/utils";
import GraphFilters from "./GraphFilters";
import { useStore } from "@nanostores/react";
import { $filteredRows } from "./stores";

ChartJS.register(ScatterController, LinearScale, PointElement, Tooltip, Legend);

interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PointData {
  x: number;
  y: number;
  id: number;
  text: string;
  sentenceIndex: number;
}

export default function ScatterGraph({
  selectedIds,
  setSelectedIds,
  stakeholders,
}: {
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  stakeholders: string[];
}) {
  const parsedText = useStore($filteredRows);
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
        selected.forEach((p) => newSet.add(`${p.id}-${p.sentenceIndex}`));
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
      if (newSet.has(`${id}-${sentenceIndex}`))
        newSet.delete(`${id}-${sentenceIndex}`);
      else newSet.add(`${id}-${sentenceIndex}`);
      return newSet;
    });
  }

  const xs = parsedText.map((p) => p?.coords?.x ?? 0);
  const ys = parsedText.map((p) => p?.coords?.y ?? 0);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const pointData: PointData[] = parsedText.map((p) => ({
    x: p?.coords?.x ?? 0,
    y: p?.coords?.y ?? 0,
    id: p.id,
    text: p.text,
    sentenceIndex: p.sentenceIndex,
  }));

  function getShape(row: Row) {
    const shapes = ["rect", "circle", "rectRot", "triangle", "star"];
    const index = stakeholders.findIndex(
      (val) => val === row.stakeholder.trim()
    );
    return shapes[index % shapes.length];
  }

  function shapeColours() {
    return parsedText.map((p) => {
      const alpha = oneToHex(p.sentiment?.score ?? 0.5);

      const [
        lightGreen,
        lightRed,
        brightGreen,
        brightRed,
        lightGrey,
        brightGrey,
      ] = [
        `#40B840${alpha}`,
        `#ee9090${alpha}`,
        `#00ff00${alpha}`,
        `#ff0000${alpha}`,
        "#A0ACB0",
        "#493657",
      ];

      if (p?.sentiment?.label) {
        let light = "";
        let bright = "";
        if (p.sentiment.label.toLowerCase() === "negative") {
          light = lightRed;
          bright = brightRed;
        } else {
          light = lightGreen;
          bright = brightGreen;
        }
        return selectedIds.has(`${p.id}-${p.sentenceIndex}`) ? bright : light;
      }
      return selectedIds.has(`${p.id}-${p.sentenceIndex}`)
        ? brightGrey
        : lightGrey;
    });
  }

  const data = {
    datasets: [
      {
        label: "2D Embeddings",
        data: pointData,
        backgroundColor: shapeColours(),
        pointRadius: parsedText.map((row) => {
          const shape = getShape(row);
          return shape === "circle" ? 5 : 6.5;
        }),
        borderWidth: parsedText.map((row) =>
          row?.sentiment?.label &&
          selectedIds.has(`${row.id}-${row.sentenceIndex}`)
            ? 1.5
            : 0
        ),
        borderColor: "#000000",
        pointStyle: parsedText.map((row) => {
          return getShape(row);
        }),
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
          <div className="flex w-full pr-2">
            <h2 className="text-xl font-semibold mb-2 ml-8">
              2D Embedding Scatterplot
            </h2>
            <GraphFilters stakeholders={stakeholders} />
          </div>
          <div
            className="relative w-full min-h-[500px] cursor-crosshair"
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
        </>
      )}
    </>
  );
}
