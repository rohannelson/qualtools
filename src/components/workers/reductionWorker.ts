import { UMAP } from "umap-js";
import { PCA } from "ml-pca";

export interface ReductionWorkerMessage {
  embeddings: number[][];
}

export interface ReductionWorkerResponse {
  coords?: number[][];
  error?: string;
}

self.onmessage = async (e: MessageEvent<ReductionWorkerMessage>) => {
  try {
    let { embeddings } = e.data;

    //>120 requires PCA to reduce vector size, otherwise 'too much recursion' error.
    //Could turn this into a formula instead of manual conditional statements.
    if (embeddings[0].length > 120) {
      let nComponents: number = 192;
      if (embeddings.length > 1920) {
        nComponents = 12;
      } else if (embeddings[0].length > 960) {
        nComponents = 24;
      } else if (embeddings[0].length > 480) {
        nComponents = 48;
      } else if (embeddings[0].length > 240) {
        nComponents = 96;
      }

      const pca = new PCA(embeddings);
      const reducedEmbeddings = pca.predict(embeddings, { nComponents });
      embeddings = reducedEmbeddings.to2DArray();
    }

    const umap = new UMAP({
      nNeighbors: Math.min(15, embeddings.length - 1) || 2,
      spread: 2.0,
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
