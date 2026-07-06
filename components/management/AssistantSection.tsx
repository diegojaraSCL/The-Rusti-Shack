"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { formatPrice } from "@/lib/format";
import type { ChartDirective } from "@/lib/management-assistant-tools";

type ChatMessage = { role: "user" | "assistant"; text: string; charts?: ChartDirective[] };

type RateStatus = {
  requestsLastMinute: number;
  requestsToday: number;
  costToday: number;
  costThisMonth: number;
  rpmCap: number;
  rpdCap: number;
  dailySpendCap: number;
  monthlySpendCap: number;
};

// Kept as a small local constant rather than importing from
// lib/management-assistant-gemini.ts, which has `import "server-only"` —
// importing a value from it here would break the client build.
const MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (cheaper)" },
];

const EXAMPLE_QUESTIONS = [
  "Which kind of customer spends the most?",
  "How did this season compare to last season?",
  "Which products tend to sell together?",
];

const CHART_COLORS = ["#2a9d8f", "#e8693a", "#1a3a5c", "#d4b87a", "#3ab5a6", "#f0825a"];

// formatPrice's standard 2-decimal currency formatting rounds real per-question
// costs (fractions of a cent) down to "$0.00", which defeats the point of a
// running-cost display. Show enough precision to actually see it move.
function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export default function AssistantSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(MODELS[0].id);
  const [sessionCost, setSessionCost] = useState(0);
  const [rateStatus, setRateStatus] = useState<RateStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setError(null);
    const history = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", text: m.text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/management/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, model }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", text: json.reply, charts: json.charts }]);
      setSessionCost((c) => c + (json.usage?.costUsd ?? 0));
      setRateStatus(json.rateStatus);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-navy-800 leading-snug">Ask the Data</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="border border-sand-200 rounded-full px-3 py-1.5 bg-white text-navy-800"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <span className="bg-white border border-sand-200 rounded-full px-3 py-1.5">
            Session cost: <strong className="text-navy-800">{formatCost(sessionCost)}</strong>
          </span>
          {rateStatus && (
            <span className="bg-white border border-sand-200 rounded-full px-3 py-1.5">
              {rateStatus.requestsLastMinute}/{rateStatus.rpmCap} req/min &middot; {rateStatus.requestsToday}/{rateStatus.rpdCap} today &middot;{" "}
              {formatCost(rateStatus.costToday)}/{formatCost(rateStatus.dailySpendCap)} spent today
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-sand-200 flex flex-col" style={{ height: 520 }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-sm text-gray-500">
              <p className="mb-3">Ask a plain-English question about the shop&rsquo;s own data. A few ideas:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs bg-sand-50 border border-sand-200 rounded-full px-3 py-1.5 hover:border-teal-500 hover:text-teal-600"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === "user" ? "bg-navy-800 text-white" : "bg-sand-50 border border-sand-200 text-gray-800"
                }`}
              >
                {m.role === "assistant" ? <AssistantText text={m.text} /> : <p className="text-sm">{m.text}</p>}
                {m.charts && m.charts.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {m.charts.map((c, ci) => (
                      <ChartBlock key={ci} chart={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-gray-500">Thinking&hellip;</div>}
        </div>

        {error && <div className="px-4 py-2 text-sm text-coral-600 border-t border-sand-200">{error}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-sand-200 p-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about revenue, customers, products..."
            className="flex-1 border border-sand-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-teal-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-full px-5 py-2 text-sm font-medium"
          >
            Send
          </button>
        </form>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Answers are grounded in your real data through read-only tools only — never a guess, never a write. Customer
        identities are never shown to the model, only anonymous IDs.
      </p>
    </div>
  );
}

// ── Lightweight markdown: **bold** and pipe tables only ─────────────────

function parseMarkdownBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function isPipeTable(block: string): boolean {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length >= 2 && lines.every((l) => l.includes("|")) && /^\|?[\s:-]+\|/.test(lines[1] ?? "");
}

function parsePipeTable(block: string): string[][] {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const dataLines = [lines[0], ...lines.slice(2)];
  return dataLines.map((line) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim())
  );
}

function renderInlineBold(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

function AssistantText({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) =>
        isPipeTable(block) ? (
          <table key={bi} className="w-full text-sm border-collapse">
            <tbody>
              {parsePipeTable(block).map((row, ri) => (
                <tr key={ri} className={ri === 0 ? "font-semibold border-b border-sand-300" : "border-b border-sand-100"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1 pr-4 align-top">
                      {renderInlineBold(cell, `${bi}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p key={bi} className="text-sm leading-relaxed">
            {renderInlineBold(block, `${bi}`)}
          </p>
        )
      )}
    </div>
  );
}

// ── Structured chart rendering (Recharts only, never model-drawn) ───────

function formatByFormat(value: number, format?: "currency" | "number" | "percent"): string {
  if (format === "currency") return formatPrice(value);
  if (format === "percent") return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat("en-US").format(value);
}

function ChartBlock({ chart }: { chart: ChartDirective }) {
  if (chart.type === "number_card") {
    return (
      <div className="bg-white rounded-2xl border border-sand-200 p-4 inline-block">
        <div className="text-xs text-gray-500">{chart.label}</div>
        <div className="text-2xl font-bold text-navy-800">{formatByFormat(chart.value, chart.format)}</div>
      </div>
    );
  }

  if (chart.type === "bar") {
    const rows = chart.labels.map((label, i) => ({ label, value: chart.values[i] ?? 0 }));
    return (
      <div className="bg-sand-50 rounded-2xl border border-sand-200 p-4">
        {chart.title && <div className="text-sm font-semibold text-navy-800 mb-2">{chart.title}</div>}
        <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 36)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={140} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {rows.map((_, i) => (
                <Cell key={i} fill={chart.colors?.[i] ?? CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "pie") {
    const rows = chart.labels.map((label, i) => ({ name: label, value: chart.values[i] ?? 0 }));
    return (
      <div className="bg-sand-50 rounded-2xl border border-sand-200 p-4">
        {chart.title && <div className="text-sm font-semibold text-navy-800 mb-2">{chart.title}</div>}
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {rows.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === "line") {
    const rows = chart.xLabels.map((x, i) => {
      const row: Record<string, string | number> = { x };
      chart.series.forEach((s) => {
        row[s.name] = s.values[i] ?? 0;
      });
      return row;
    });
    return (
      <div className="bg-sand-50 rounded-2xl border border-sand-200 p-4">
        {chart.title && <div className="text-sm font-semibold text-navy-800 mb-2">{chart.title}</div>}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b0" />
            <XAxis dataKey="x" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {chart.series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
