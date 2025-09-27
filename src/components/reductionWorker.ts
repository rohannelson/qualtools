import { UMAP, type UMAPParameters } from "umap-js";

export interface ReductionWorkerMessage {
  embeddings: number[][];
}

export interface ReductionWorkerResponse {
  coords?: number[][];
  error?: string;
}

self.onmessage = async (e: MessageEvent<ReductionWorkerMessage>) => {
  try {
    const { embeddings } = e.data;

    const umap = new UMAP({
      nComponents: 2,
      nNeighbors: Math.min(20, embeddings.length - 1) || 2,
      minDist: 0.05,
      spread: 2.0,
      nEpochs: 500,
    });

    await umap.fitAsync(embeddings);

    const coords = umap.getEmbedding();
    const response: ReductionWorkerResponse = { coords };
    self.postMessage(response);
  } catch (err: any) {
    const errorMessage: ReductionWorkerResponse = {
      error: err.message,
    };
    self.postMessage(errorMessage);
  }
};
