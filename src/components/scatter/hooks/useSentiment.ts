import type { Dispatch, SetStateAction } from "react";
import { Status, type Row } from "../types";
import type {
  SentimentWorkerMessage,
  SentimentWorkerResponse,
} from "../workers/sentimentWorker";
import { $rows, $status } from "../stores";
import { useStore } from "@nanostores/react";

export default function useSentiment() {
  const parsedText = useStore($rows);

  //Sentiment analysis
  function getSentiment() {
    $status.set(Status.SENTIMENT);
    const sentimentWorker = new Worker(
      new URL("../workers/sentimentWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const sentimentMessage: SentimentWorkerMessage = {
      responses: parsedText,
    };
    sentimentWorker.postMessage(sentimentMessage);

    sentimentWorker.onmessage = (e: MessageEvent<SentimentWorkerResponse>) => {
      const { sentiments } = e.data;
      parsedText.forEach((response, i) => {
        response.sentiment = sentiments[i];
      });
      $rows.set([...parsedText]);
      $status.set(Status.COMPLETE);
      sentimentWorker.terminate();
    };
  }
  return getSentiment;
}
