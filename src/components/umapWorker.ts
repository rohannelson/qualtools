import { UMAP, type UMAPParameters } from "umap-js";

interface WorkerMessage {
  embeddings: number[][];
  config?: UMAPParameters;
  usePCA?: boolean;
}

interface WorkerResponse {
  coords?: number[][];
  progress?: number;
  error?: string;
}

// Optional PCA truncation for large embeddings
function applyPCA(data: number[][], nComponents = 50): number[][] {
  return data.map((row) => row.slice(0, Math.min(nComponents, row.length)));
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const { embeddings, config, usePCA } = e.data;
    let data = embeddings;

    if (usePCA) {
      data = applyPCA(data, 50);
    }

    const umap = new UMAP({
      nComponents: 2,
      nNeighbors: Math.min(20, data.length - 1) || 2,
      minDist: 0.05,
      spread: 2.0,
      nEpochs: 500,
      ...config,
    });

    // Callback for incremental progress (0–50%)
    const epochCallback = (epoch: number, nEpochs: number) => {
      const percent = Math.floor((epoch / nEpochs) * 50);
      (self as unknown as Worker).postMessage({
        progress: percent,
      } as WorkerResponse);
    };

    await umap.fitAsync(
      data,
      epochCallback as unknown as (epochNumber: number) => boolean | void
    );

    const coords = umap.getEmbedding();
    (self as unknown as Worker).postMessage({
      coords,
      progress: 50,
    } as WorkerResponse);
  } catch (err: any) {
    (self as unknown as Worker).postMessage({
      error: err.message,
    } as WorkerResponse);
  }
};
