import { pipeline } from "@xenova/transformers";
import type { Row } from "./types";
import { chunkArray } from "../lib/utils";

export interface EmbeddingsWorkerMessage {
  responses: Row[];
}

export interface EmbeddingsWorkerResponse {
  embeddings: number[][];
  progress?: number;
  error?: string;
}

self.onmessage = async (e: MessageEvent<EmbeddingsWorkerMessage>) => {
  const { responses } = e.data;

  const extractor = await pipeline(
    "feature-extraction",
    "/Xenova/all-MiniLM-L6-v2"
  );

  const responseArray = responses.map((response) => response.text);
  const chunkedResponses = chunkArray<string>(responseArray, 50);
  const chunkedEmbeddings: number[][][] = [];
  for (const chunk of chunkedResponses) {
    const embeddings = await extractor(chunk, {
      pooling: "mean",
      normalize: true,
    });
    chunkedEmbeddings.push(embeddings.tolist());
  }

  const embeddings = chunkedEmbeddings.map((embeds) => embeds).flat();

  const response: EmbeddingsWorkerResponse = { embeddings };
  self.postMessage(response);
};
