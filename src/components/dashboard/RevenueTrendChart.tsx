import type { ApexOptions } from "apexcharts";
import Chart from "react-apexcharts";
import type { Dashboard } from "../../api/dashboard.queries";
import { formatCents } from "../../utils";
import { CHART } from "./chartTheme";

/** `2026-10-16` as "Oct 16". Formatted in UTC on purpose: a calendar day has no time zone. */
function shortDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** An axis label in whole dollars ("$1,200"): a label only; the tooltip shows the exact amount with `formatCents`. */
function axisDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/**
 * Money received per Chicago day: one bar a day, quiet days at zero. Built from TailAdmin's `ecommerce/MonthlySalesChart`
 * (a bar chart), with its card, menu and demo data removed and its colours changed to the dark theme (D87, D20). The
 * values plotted are integer cents; they are only formatted for display.
 *
 * Loaded lazily by the dashboard (`React.lazy`), so the chart library is not in the code every other page downloads.
 */
export default function RevenueTrendChart({
  days,
}: {
  days: Dashboard["trend"];
}) {
  if (days.every((d) => d.amountCents === 0)) {
    return (
      <p className="py-16 text-center text-theme-sm text-gray-500">
        No payments in the last {days.length} days.
      </p>
    );
  }

  const options: ApexOptions = {
    colors: [CHART.brand],
    chart: {
      fontFamily: CHART.font,
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        columnWidth: "65%",
        borderRadius: 3,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
    xaxis: {
      categories: days.map((d) => shortDay(d.day)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      // 21 labels do not fit in a narrow card (they ran together at a third of the page width): about five are shown.
      tickAmount: 5,
      labels: {
        rotate: 0,
        hideOverlappingLabels: true,
        style: { colors: CHART.muted, fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        formatter: (cents: number) => axisDollars(cents),
        style: { colors: CHART.muted, fontSize: "11px" },
      },
    },
    grid: { borderColor: CHART.grid, strokeDashArray: 3 },
    fill: { opacity: 1 },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: { formatter: (cents: number) => formatCents(Math.round(cents)) },
    },
  };
  const series = [{ name: "Received", data: days.map((d) => d.amountCents) }];

  return <Chart options={options} series={series} type="bar" height={280} />;
}
