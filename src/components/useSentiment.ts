import type { Dispatch, SetStateAction } from "react";
import { Status, type Row } from "./types";
import type {
  SentimentWorkerMessage,
  SentimentWorkerResponse,
} from "./workers/sentimentWorker";
import { $rows } from "./stores";

export default function useSentiment({
  setStatus,
  parsedText,
}: {
  setStatus: Dispatch<SetStateAction<Status>>;
  parsedText: Row[];
}) {
  //Sentiment analysis
  function getSentiment() {
    setStatus(Status.SENTIMENT);
    const sentimentWorker = new Worker(
      new URL("./workers/sentimentWorker.ts", import.meta.url),
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
      sentimentWorker.terminate();
    };
  }
  return getSentiment;
}
