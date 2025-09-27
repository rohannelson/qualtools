export type Row = {
  id: number;
  text: string;
  stakeholder: string;
  block?: number;
  sentiment?: "negative" | "positive";
  embedding?: number[];
};
