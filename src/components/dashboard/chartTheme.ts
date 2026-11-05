import type { PaymentSource } from "../../api/payments.queries";

/**
 * The dark "ledger" colours (D87) as plain hex. ApexCharts draws SVG from option objects and cannot read Tailwind classes
 * or CSS variables, so the values from `src/index.css` are repeated here; change them together.
 */
export const CHART = {
  brand: "#d9652b", // --color-brand-500
  success: "#4fae70", // --color-success-500
  error: "#e0604f", // --color-error-500
  warning: "#d9a63a", // --color-warning-500
  blue: "#6e95d1", // --color-blue-light-500
  blueDeep: "#4a72ad", // --color-blue-light-400
  violet: "#9b8bd6", // not a token: a sixth hue so no two sources share a colour
  grid: "#24344f", // --color-gray-200 (borders)
  muted: "#93a3be", // --color-gray-500 (labels)
  text: "#f3eee3", // --color-gray-900 (the brightest text)
  font: "IBM Plex Sans, Helvetica Neue, Arial, sans-serif",
} as const;

/** One colour per payment source, used by the source donut and its bars so they always match. */
export const SOURCE_COLOR: Record<PaymentSource, string> = {
  email_zelle: CHART.blue,
  email_cashapp: CHART.success,
  email_chime: CHART.brand,
  email_stripe: CHART.warning,
  email_venmo: CHART.violet,
  plaid_zelle: CHART.blueDeep,
  manual: CHART.muted,
};

/** The Tailwind background class matching `SOURCE_COLOR`, for `BarRow`. */
export const SOURCE_BAR_CLASS: Record<PaymentSource, string> = {
  email_zelle: "bg-blue-light-500",
  email_cashapp: "bg-success-500",
  email_chime: "bg-brand-500",
  email_stripe: "bg-warning-500",
  email_venmo: "bg-[#9b8bd6]",
  plaid_zelle: "bg-blue-light-400",
  manual: "bg-gray-500",
};
