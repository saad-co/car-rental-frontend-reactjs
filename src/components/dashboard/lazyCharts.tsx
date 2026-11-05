import { lazy, Suspense, type ComponentProps } from "react";
import Spinner from "../ui/spinner/Spinner";

// The chart library is large, so the charts are loaded the first time the dashboard shows one (`React.lazy` splits
// them into their own file). Every other page of the app never downloads it.
const RevenueTrendChartLazy = lazy(() => import("./RevenueTrendChart"));
const DonutChartLazy = lazy(() => import("./DonutChart"));

/** What shows while a chart's code is downloading: a spinner in the chart's place, so the card does not jump. */
function ChartFallback({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center gap-2 text-theme-sm text-gray-500"
      style={{ height }}
    >
      <Spinner /> Loading chart…
    </div>
  );
}

/** `RevenueTrendChart`, downloaded on first use. */
export function RevenueTrend(
  props: ComponentProps<typeof RevenueTrendChartLazy>,
) {
  return (
    <Suspense fallback={<ChartFallback height={280} />}>
      <RevenueTrendChartLazy {...props} />
    </Suspense>
  );
}

/** `DonutChart`, downloaded on first use. */
export function Donut(props: ComponentProps<typeof DonutChartLazy>) {
  return (
    <Suspense fallback={<ChartFallback height={props.size ?? 190} />}>
      <DonutChartLazy {...props} />
    </Suspense>
  );
}
