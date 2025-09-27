import type { TextClassificationSingle } from "@xenova/transformers";

export type Row = {
  id: number;
  sentenceIndex: number;
  text: string;
  stakeholder: string;
  sentiment?: TextClassificationSingle;
  embedding?: number[];
};

export enum Status {
  PENDING = "Awaiting user input",
  PARSING = "Parsing responses",
  EMBEDDING = "Generating embeddings",
  MERGING = "Validating response splits",
  SENTIMENT = "Analyzing sentiment",
  MAPPING = "Plotting on scattergraph",
  COMPLETE = "Processing complete!",
  ERROR = "Error",
}

export interface Point {
  id: number;
  text: string;
  x: number;
  y: number;
}
