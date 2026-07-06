import "server-only";
import type { MonthlyFinancial } from "./management-aggregates";
import {
  forecastLinearTrend,
  forecastSeasonalNaive,
  forecastHoltWinters,
  backtestModel,
  type ForecastPoint,
} from "./forecast-models";

export const MAX_HORIZON = 24;

export type SeriesPoint = {
  label: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
};

export type ModelBundle = {
  id: "linear" | "seasonal" | "holtwinters";
  name: string;
  shortDescription: string;
  description: string;
  errorPct: number;
  series: SeriesPoint[]; // history + MAX_HORIZON forecast points
};

// Forecasting needs consecutive calendar months. A gap (e.g. May/June 2026
// have zero orders, but a couple of test purchases landed in July) would
// silently misalign every model's month-of-year seasonal indexing. Cut the
// series at the first gap so forecasting only ever sees a clean run.
export function truncateToContiguous(monthly: MonthlyFinancial[]): MonthlyFinancial[] {
  const result: MonthlyFinancial[] = [];
  for (let i = 0; i < monthly.length; i++) {
    if (i > 0) {
      const prev = monthly[i - 1];
      const expectedMonth = prev.month === 12 ? 1 : prev.month + 1;
      const expectedYear = prev.month === 12 ? prev.year + 1 : prev.year;
      if (monthly[i].year !== expectedYear || monthly[i].month !== expectedMonth) break;
    }
    result.push(monthly[i]);
  }
  return result;
}

function buildSeries(history: MonthlyFinancial[], points: ForecastPoint[]): SeriesPoint[] {
  const historySeries: SeriesPoint[] = history.map((m) => ({
    label: m.label,
    actual: m.revenue,
    forecast: null,
    lower: null,
    upper: null,
  }));

  // Bridge point: the forecast line starts exactly where the actual line
  // ends, so the chart has no visual gap between solid and dashed.
  if (historySeries.length > 0) {
    historySeries[historySeries.length - 1].forecast = historySeries[historySeries.length - 1].actual;
  }

  const lastDate = history[history.length - 1];
  let year = lastDate.year;
  let month = lastDate.month;

  const forecastSeries: SeriesPoint[] = points.map((p) => {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return {
      label: `${year}-${String(month).padStart(2, "0")}`,
      actual: null,
      forecast: Math.round(p.point),
      lower: Math.round(p.lower),
      upper: Math.round(p.upper),
    };
  });

  return [...historySeries, ...forecastSeries];
}

export function buildForecastModels(monthly: MonthlyFinancial[]): ModelBundle[] {
  const history = truncateToContiguous(monthly);
  const series = history.map((m) => m.revenue);

  const linearPoints = forecastLinearTrend(series, MAX_HORIZON);
  const seasonalPoints = forecastSeasonalNaive(series, MAX_HORIZON);
  const holtWintersPoints = forecastHoltWinters(series, MAX_HORIZON);

  const linearError = backtestModel(series, forecastLinearTrend, 6);
  const seasonalError = backtestModel(series, forecastSeasonalNaive, 6);
  const holtWintersError = backtestModel(series, forecastHoltWinters, 6);

  return [
    {
      id: "linear",
      name: "Linear Trend",
      shortDescription: "A straight growth line through history",
      description:
        "Fits a single straight line through every month of revenue and extends it forward. It assumes the business keeps growing (or shrinking) at the same steady pace it has on average, and it doesn't know about seasons at all -- Typhoon season and Dry Peak season get treated the same. Trust it as a rough floor/ceiling check, not for month-to-month planning, since it will miss the seasonal swings you actually see in the shop.",
      errorPct: linearError,
      series: buildSeries(history, linearPoints),
    },
    {
      id: "seasonal",
      name: "Seasonal Naive + Trend",
      shortDescription: "Repeats last year's pattern, scaled by recent growth",
      description:
        "Takes what actually happened in this same month last year, then scales it up (or down) by the average year-over-year growth rate seen over the last 12 months. This directly captures Apo Island's real seasonal rhythm -- Shoulder, Typhoon, Dry Peak -- since it's built from your actual seasonal pattern, not a formula's guess at one. Trust it most when the recent growth rate is a fair stand-in for the near future; it can overshoot if last year's growth spurt was a one-time thing (a viral post, a one-off promotion) rather than a lasting trend.",
      errorPct: seasonalError,
      series: buildSeries(history, seasonalPoints),
    },
    {
      id: "holtwinters",
      name: "Holt-Winters",
      shortDescription: "Adapts its own trend and seasonal shape as it goes",
      description:
        "Keeps three running estimates -- the current level of the business, its current trend, and a seasonal shape for each calendar month -- and gently updates all three with every new month rather than fixing them once. That lets it track a trend that's leveling off or a seasonal pattern that's shifting, which the other two models can't do. It's the most sophisticated of the three and, on this data, the most accurate -- but it also has the most moving parts, so it can be slower to react to a genuinely sudden change (a new product line, a competitor opening) than a simpler model would be.",
      errorPct: holtWintersError,
      series: buildSeries(history, holtWintersPoints),
    },
  ];
}
