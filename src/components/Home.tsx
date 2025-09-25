import { useRef, useState } from "react";
import { pipeline, Tensor } from "@xenova/transformers";
import { Scatter } from "react-chartjs-2";
import { Chart as ChartJS, LinearScale, PointElement, Tooltip } from "chart.js";

ChartJS.register(LinearScale, PointElement, Tooltip);

interface Point {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface DragRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Home() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chartRef = useRef<any>(null);

  const [parsedText, setParsedText] = useState<{ id: number; text: string }[]>(
    []
  );
  const [embedding2D, setEmbedding2D] = useState<Point[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");

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

      const selected = embedding2D.filter(
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

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const xs = embedding2D.map((p) => p.x);
  const ys = embedding2D.map((p) => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  // --- Submit / Embeddings ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const rawText = textareaRef.current?.value ?? "";
    const rows = rawText
      .trim()
      .split("\n")
      .map((str) => ({
        id: Number(str.split("\t")[0]),
        text: str.split("\t")[1],
      }));

    setParsedText(rows);
    setEmbedding2D([]);
    setSelectedIds(new Set());
    setProgress(0);
    setStatus("Generating embeddings...");

    if (!rows.length) return;

    const embed = await pipeline(
      "feature-extraction",
      "/Xenova/all-MiniLM-L6-v2"
    );
    const BATCH_SIZE = 20;
    const results: { id: number; vector: Tensor }[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (r) => ({ id: r.id, vector: await embed(r.text) }))
      );
      results.push(...batchResults);
      setProgress(Math.floor(((i + batch.length) / rows.length) * 50));
    }

    const numericEmbeds = results.map((r) =>
      Array.isArray(r.vector.data)
        ? r.vector.data.flat()
        : Array.from(r.vector.data as Float32Array)
    );

    const normalizedEmbeds = numericEmbeds.map((v) => {
      const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
      return v.map((x) => x / norm);
    });

    setStatus("Computing UMAP...");
    const worker = new Worker(new URL("./umapWorker.ts", import.meta.url), {
      type: "module",
    });
    worker.postMessage({ embeddings: normalizedEmbeds, usePCA: true });

    worker.onmessage = (e) => {
      const { coords, error, progress: umapProgress } = e.data;

      if (error) {
        console.error("UMAP Worker error:", error);
        setStatus("UMAP error");
        worker.terminate();
        return;
      }

      if (umapProgress !== undefined) {
        setProgress(50 + Math.floor(umapProgress / 2));
      }

      if (coords) {
        setEmbedding2D(
          coords.map((pt: number[], i: number) => ({
            id: results[i].id,
            text: rows[i].text,
            x: pt[0],
            y: pt[1],
          }))
        );
        setProgress(100);
        setStatus("Done!");
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      console.error("Worker failed:", err.message);
      setStatus("Worker failed");
    };
  }

  const data = {
    datasets: [
      {
        label: "2D Embeddings",
        data: embedding2D.map((p) => ({
          x: p.x,
          y: p.y,
          id: p.id,
          text: p.text,
        })),
        backgroundColor: embedding2D.map((p) =>
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
    <div className="m-8">
      <h1 className="text-2xl font-bold mb-2">Open Text Qual Tool</h1>

      <form onSubmit={handleSubmit} className="flex flex-col mb-4">
        <textarea
          ref={textareaRef}
          className="h-48 w-[600px] border border-gray-400 rounded-md px-2 py-1 mb-2"
          placeholder="Paste open text responses here"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded w-[120px]"
        >
          Submit
        </button>
      </form>

      {status && (
        <div className="mb-4 w-[600px]">
          <div className="mb-1">{status}</div>
          <div className="w-full h-4 bg-gray-200 rounded">
            <div
              className="h-4 bg-blue-500 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {parsedText.length > 0 && (
          <div className="w-1/3">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold">Extracted Text (Selected)</h2>
              <button
                onClick={deselectAll}
                className="px-2 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
              >
                Deselect All
              </button>
            </div>
            <table className="border-collapse border border-black w-full">
              <thead>
                <tr>
                  <th className="border border-black p-1 text-left">ID</th>
                  <th className="border border-black p-1 text-left">Text</th>
                </tr>
              </thead>
              <tbody>
                {(selectedIds.size === 0
                  ? parsedText
                  : parsedText.filter((row) => selectedIds.has(row.id))
                ).map((row) => (
                  <tr key={row.id}>
                    <td className="border border-black p-1">{row.id}</td>
                    <td className="border border-black p-1">{row.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {embedding2D.length > 0 && (
          <div className="w-[65%] h-[600px]">
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
          </div>
        )}
      </div>
    </div>
  );
}
