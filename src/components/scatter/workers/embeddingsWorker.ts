import { cos_sim, env, pipeline } from "@xenova/transformers";
import type { Row } from "../types";
import { chunkArray } from "../../../lib/utils";

export interface EmbeddingsWorkerMessage {
  responses: Row[];
}

export interface EmbeddingsWorkerResponse {
  mergedRows: Row[];
  progress?: number;
  error?: string;
}

env.allowLocalModels = false;

self.onmessage = async (e: MessageEvent<EmbeddingsWorkerMessage>) => {
  const { responses } = e.data;

  const extractor = await pipeline("feature-extraction", "Xenova/gte-small");

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

  responses.forEach((response, i) => (response.embedding = embeddings[i]));

  for (let i = responses.length - 1; i > 0; i--) {
    const thisRow = responses[i];
    for (let x = i - 1; x >= 0; x--) {
      const targetRow = responses[x];
      if (targetRow.id !== thisRow.id) break;
      const sim = cos_sim(thisRow.embedding!, targetRow.embedding!);
      if (sim > 0.4) {
        targetRow.text += " " + thisRow.text;
        const embeddingTensor = await extractor(targetRow.text, {
          pooling: "mean",
          normalize: true,
        });
        const [embedding] = embeddingTensor.tolist() as number[][];
        targetRow.embedding = embedding;
        responses.splice(i, 1);
        break;
      }
    }
  }

  const response: EmbeddingsWorkerResponse = { mergedRows: responses };
  self.postMessage(response);
};
