import { useState } from "preact/hooks";

export default function Clicker() {
  const [counter, setCounter] = useState(0);

  return (
    <div>
      <button class="jumpu-button" onClick={() => setCounter(counter + 1)}>
        count
      </button>
      <p>{counter}</p>
    </div>
  );
}
