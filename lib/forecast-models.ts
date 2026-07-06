// Three forecasting models over a monthly time series (e.g. revenue).
// Each is a real, explainable statistical method -- no AI guessing a number.
//
// 1. Linear trend regression: ordinary least squares fit of value vs. month
//    index. Assumes growth continues in a straight line; ignores seasonality.
//    Best for: a young business whose growth hasn't visibly leveled off yet.
//
// 2. Seasonal-naive with trend: repeats the same calendar month from one
//    year ago, scaled by the average year-over-year growth rate seen in the
//    last 12 months. Directly captures Apo Island's tourism seasons (the
//    data literally has Shoulder/Typhoon/Dry Peak).
//    Best for: a business with a strong repeating seasonal pattern.
//
// 3. Holt-Winters triple exponential smoothing (multiplicative): tracks a
//    smoothed level, trend, and 12-month seasonal profile all at once, each
//    updated a little with every new month. The most sophisticated of the
//    three because it adapts to *changing* trend and seasonality, not just
//    a fixed line or a fixed ratio.
//    Best for: a maturing business where both the trend and the seasonal
//    swings are still evolving.

export type Point = { t: number; value: number };
export type ForecastPoint = { t: number; point: number; lower: number; upper: number };

const Z80 = 1.2816; // two-sided 80% confidence band

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function stddev(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
function mape(actual: number[], predicted: number[]): number {
  const errors = actual.map((a, i) => (a === 0 ? 0 : Math.abs((a - predicted[i]) / a)));
  return mean(errors) * 100;
}

// ── 1. Linear trend regression ──────────────────────────────────────────
export function linearTrendFit(series: number[]) {
  const n = series.length;
  const xs = series.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(series);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (series[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const fitted = xs.map((x) => intercept + slope * x);
  const residualStd = stddev(series.map((y, i) => y - fitted[i]));
  return { slope, intercept, fitted, residualStd, n };
}

export function forecastLinearTrend(series: number[], horizon: number): ForecastPoint[] {
  const { slope, intercept, residualStd, n } = linearTrendFit(series);
  const points: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const t = n - 1 + h;
    const point = intercept + slope * t;
    const band = residualStd * Z80 * Math.sqrt(h);
    points.push({ t, point, lower: point - band, upper: point + band });
  }
  return points;
}

// ── 2. Seasonal-naive with trend ────────────────────────────────────────
export function forecastSeasonalNaive(series: number[], horizon: number): ForecastPoint[] {
  const n = series.length;
  const period = 12;
  // Average YoY growth ratio over the most recent complete year of overlap.
  const ratios: number[] = [];
  for (let i = n - period; i < n; i++) {
    if (i - period >= 0 && series[i - period] > 0) ratios.push(series[i] / series[i - period]);
  }
  const growthFactor = ratios.length > 0 ? mean(ratios) : 1;

  // Residual std from a one-step-ahead check over the last full year, so
  // the band reflects how noisy this method actually is on this data.
  const checkErrors: number[] = [];
  for (let i = n - period; i < n; i++) {
    if (i - period >= 0) checkErrors.push(series[i] - series[i - period] * growthFactor);
  }
  const residualStd = checkErrors.length > 0 ? stddev(checkErrors) : 0;

  const points: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const sourceIndex = n + h - 1 - period;
    const cycles = Math.floor((h - 1) / period) + 1; // compounds growth once per extra year out
    const base = sourceIndex >= 0 ? series[sourceIndex] : mean(series);
    const point = base * Math.pow(growthFactor, cycles);
    const band = residualStd * Z80 * Math.sqrt(h);
    points.push({ t: n - 1 + h, point, lower: point - band, upper: point + band });
  }
  return points;
}

// ── 3. Holt-Winters triple exponential smoothing (additive) ────────────
// Additive rather than multiplicative seasonality: the real series has
// several near-zero months (the shop's first few months barely sold
// anything), and multiplicative Holt-Winters divides by the seasonal
// index -- a near-zero index sends the level estimate into the millions
// and it never recovers. Additive uses subtraction instead of division,
// which stays numerically stable through zero/near-zero months. This is
// the standard textbook fix for exactly this situation.
function holtWintersFit(series: number[], alpha: number, beta: number, gamma: number, period = 12) {
  const n = series.length;
  const firstCycle = series.slice(0, period);
  const secondCycle = series.slice(period, period * 2);
  let level = mean(firstCycle);
  let trend = (mean(secondCycle) - mean(firstCycle)) / period;
  const seasonals: number[] = firstCycle.map((v) => v - level);

  const fitted: number[] = [];
  const levels: number[] = [];
  const trends: number[] = [];

  for (let t = 0; t < n; t++) {
    const s = seasonals[t % period] ?? 0;
    const prevLevel = level;
    const forecastNow = level + trend + s;
    fitted.push(t < period ? series[t] : forecastNow);

    level = alpha * (series[t] - s) + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonals[t % period] = gamma * (series[t] - level) + (1 - gamma) * s;

    levels.push(level);
    trends.push(trend);
  }

  return { level, trend, seasonals, fitted };
}

// Small grid search for smoothing parameters that fit this series best —
// a standard, practical stand-in for a full optimizer.
function fitHoltWinters(series: number[], period = 12) {
  const candidates = [0.1, 0.3, 0.5, 0.7, 0.9];
  let best: { alpha: number; beta: number; gamma: number; sse: number } | null = null;
  for (const alpha of candidates) {
    for (const beta of candidates) {
      for (const gamma of candidates) {
        const { fitted } = holtWintersFit(series, alpha, beta, gamma, period);
        const sse = series.reduce((s, y, i) => s + (y - fitted[i]) ** 2, 0);
        if (!best || sse < best.sse) best = { alpha, beta, gamma, sse };
      }
    }
  }
  return best!;
}

export function forecastHoltWinters(series: number[], horizon: number): ForecastPoint[] {
  const period = 12;
  const { alpha, beta, gamma } = fitHoltWinters(series, period);
  const { level, trend, seasonals, fitted } = holtWintersFit(series, alpha, beta, gamma, period);
  const residualStd = stddev(series.map((y, i) => y - fitted[i]));

  const points: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const s = seasonals[(series.length - 1 + h) % period] ?? 0;
    const point = level + h * trend + s;
    const band = residualStd * Z80 * Math.sqrt(h);
    points.push({ t: series.length - 1 + h, point, lower: point - band, upper: point + band });
  }
  return points;
}

// ── Backtest: hold out the last N months, forecast them, compare ───────
export function backtestModel(
  series: number[],
  forecastFn: (train: number[], horizon: number) => ForecastPoint[],
  holdout = 6
): number {
  if (series.length <= holdout + 12) return NaN; // not enough history to backtest meaningfully
  const train = series.slice(0, series.length - holdout);
  const actual = series.slice(series.length - holdout);
  const predicted = forecastFn(train, holdout).map((p) => p.point);
  return mape(actual, predicted);
}
