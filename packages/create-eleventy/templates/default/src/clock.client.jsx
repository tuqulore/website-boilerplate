import { clientOnlyComponent } from "@tuqulore-inc/eleventy-preset/island";
import { useEffect, useState } from "preact/hooks";

/** @param {{ locale: string }} props */
function Clock(props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <time class="text-xl tabular-nums" dateTime={now.toISOString()}>
      {now.toLocaleTimeString(props.locale)}
    </time>
  );
}

export default clientOnlyComponent(Clock, import.meta.url);
