import type { TextClassificationSingle } from "@xenova/transformers";

export type Row = {
  id: number;
  sentenceIndex: number;
  text: string;
  stakeholder: string;
  sentiment?: TextClassificationSingle;
  embedding?: number[];
  coords?: { x: number; y: number };
  roots?: string[];
};

export enum Status {
  PENDING = "Awaiting user input",
  PARSING = "Parsing responses",
  EMBEDDING = "Generating embeddings",
  MERGING = "Validating response splits",
  SENTIMENT = "Analyzing sentiment",
  MAPPING = "Plotting on scattergraph",
  STEMMING = "Determining word frequency",
  COMPLETE = "Processing complete!",
  ERROR = "Error",
}

export interface Point {
  id: number;
  text: string;
  x: number;
  y: number;
}

export type CompromiseTerm = {
  text: string;
  normal: string;
  root?: string;
  tags: string[];
  pre: string;
  post: string;
};

export type WordsFreq = [string, number][];
