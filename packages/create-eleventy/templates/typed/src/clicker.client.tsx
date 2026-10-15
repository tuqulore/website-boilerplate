import { useSignal } from "@preact/signals";
import { clientComponent } from "@tuqulore-inc/eleventy-preset/island";

function Clicker() {
  const counter = useSignal(0);

  return (
    <div class="flex items-center gap-4">
      <button type="button" class="jumpu-button" onClick={() => counter.value++}>
        Count
      </button>
      <output class="text-xl tabular-nums">{counter}</output>
    </div>
  );
}

export default clientComponent(Clicker, import.meta.url);
