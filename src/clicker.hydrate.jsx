import { useState } from "preact/hooks";

function Clicker() {
  const [counter, setCounter] = useState(0);

  return (
    <div>
      <button class="jumpu-button" onClick={() => setCounter(counter + 1)}>
        Count
      </button>
      <p>{counter}</p>
    </div>
  );
}

export default function Teamplate() {
  return <Clicker />;
}
