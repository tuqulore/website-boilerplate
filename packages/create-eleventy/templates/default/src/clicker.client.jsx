import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useState } from "preact/hooks";

function Clicker() {
  const [counter, setCounter] = useState(0);

  return (
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="jumpu-button"
        onClick={() => setCounter(counter + 1)}
      >
        Count
      </button>
      <output class="text-xl tabular-nums">{counter}</output>
    </div>
  );
}

export default clientComponent(Clicker, import.meta.url);
