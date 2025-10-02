import ScatterForm from "./scatter/ScatterForm";
import { Status } from "./scatter/types";
import ScatterResults from "./scatter/ScatterResults";
import { useStore } from "@nanostores/react";
import { $status } from "./scatter/stores";

export default function App() {
  const status = useStore($status);
  return (
    <>{status === Status.PENDING ? <ScatterForm /> : <ScatterResults />}</>
  );
}
