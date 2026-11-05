import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import { CHART } from "./chartTheme";

/** One slice of the ring. `value` is a count or an amount in cents, drawn in proportion; `color` is a hex colour. */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * A ring split into slices, with a title and a figure in the middle. Built from TailAdmin's `crm/SalePieChart`
 * (a donut chart), with its card, menu, demo data and legend removed and its colours changed to the dark theme (D87, D20);
 * the page draws its own legend next to it, so the legend can carry the amounts.
 *
 * `formatValue` turns a slice's value into the tooltip text (`formatCents` for money, `String` for counts).
 * Loaded lazily by the dashboard (`React.lazy`), like the revenue chart.
 */
export default function DonutChart({
  slices,
  centerLabel,
  centerValue,
  formatValue,
  size = 190,
}: {
  slices: DonutSlice[];
  /** Small text above the figure in the middle, e.g. "Sources" or "Drivers". */
  centerLabel: string;
  /** The figure in the middle, already formatted. */
  centerValue: string;
  formatValue: (value: number) => string;
  size?: number;
}) {
  // Nothing to draw: a plain empty ring keeps the card's layout and says so.
  if (slices.every((slice) => slice.value <= 0)) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border-[14px] border-gray-100 text-center"
        style={{ width: size, height: size }}
      >
        <span className="px-6 text-theme-xs text-gray-500">Nothing yet</span>
      </div>
    );
  }

  const options: ApexOptions = {
    colors: slices.map((slice) => slice.color),
    labels: slices.map((slice) => slice.label),
    chart: {
      fontFamily: CHART.font,
      type: "donut",
      background: "transparent",
      animations: { enabled: false },
    },
    stroke: { show: true, width: 2, colors: ["#142035"] }, // the card colour (--color-surface), so slices have a gap
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          background: "transparent",
          labels: {
            show: true,
            name: {
              show: true,
              offsetY: -2,
              color: CHART.muted,
              fontSize: "12px",
            },
            value: {
              show: true,
              offsetY: 4,
              color: CHART.text,
              fontSize: "18px",
              fontWeight: 600,
              formatter: (value: string) => formatValue(Number(value)),
            },
            total: {
              show: true,
              label: centerLabel,
              color: CHART.muted,
              fontSize: "12px",
              formatter: () => centerValue,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      y: { formatter: (value: number) => formatValue(value) },
    },
    states: { hover: { filter: { type: "none" } } },
  };

  return (
    <Chart
      options={options}
      series={slices.map((slice) => slice.value)}
      type="donut"
      width={size}
      height={size}
    />
  );
}
