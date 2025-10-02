import {
  env,
  pipeline,
  type TextClassificationOutput,
} from "@xenova/transformers";
import type { Row } from "../types";
import { chunkArray } from "../../../lib/utils";

export interface SentimentWorkerMessage {
  responses: Row[];
}

export interface SentimentWorkerResponse {
  sentiments: TextClassificationOutput;
  progress?: number;
  error?: string;
}

env.allowLocalModels = false;

self.onmessage = async (e: MessageEvent<SentimentWorkerMessage>) => {
  const { responses } = e.data;

  const analyst = await pipeline(
    "sentiment-analysis",
    "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
  );

  const responseArray = responses.map((response) => response.text);
  const chunkedResponses = chunkArray<string>(responseArray, 50);
  const chunkedSentiments: TextClassificationOutput[] = [];
  for (const chunk of chunkedResponses) {
    const output = await analyst(chunk);
    const sentiments = Array.isArray(output) ? output.flat() : [output];

    chunkedSentiments.push(sentiments);
  }

  const sentiments = chunkedSentiments.map((sentiment) => sentiment).flat();

  const response: SentimentWorkerResponse = { sentiments };
  self.postMessage(response);
};
