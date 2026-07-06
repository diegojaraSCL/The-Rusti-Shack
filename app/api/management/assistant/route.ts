import { cookies } from "next/headers";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import {
  fetchOrders,
  fetchOrderLines,
  fetchCustomers,
  fetchProducts,
  fetchRentals,
  fetchPromotions,
  fetchOrderPromotions,
  fetchEmployees,
} from "@/lib/management-data";
import { AVAILABLE_MODELS, callGemini, computeCostUsd, type GeminiContent, type GeminiModelId, type GeminiPart } from "@/lib/management-assistant-gemini";
import { assertWithinGuardrails, recordUsage, getUsageStatus, GuardrailError } from "@/lib/management-assistant-guardrails";
import { TOOL_DECLARATIONS, executeAssistantTool, type ChartDirective, type AssistantData } from "@/lib/management-assistant-tools";

export const dynamic = "force-dynamic";

const MAX_TOOL_STEPS = 8; // assignment estimates 3-6 steps per question; this is a hard ceiling against a runaway loop

const SYSTEM_INSTRUCTION = `You are a data assistant for The Rusti Shack, a beach gear shop on Apo Island, Philippines. You are used only by the shop owner and her authorized staff, inside the password-protected management back office.

Rules you must follow, with no exceptions:
1. You have no knowledge of this shop's numbers except what your tools return. Before stating any figure, you must call a tool. If no tool can answer the question, say so plainly instead of guessing or estimating.
2. Never use outside/general knowledge to answer a question about the shop's data — only tool results.
3. You will never receive customer names, emails, phone numbers, or addresses — only anonymous customer IDs like "CUST00042". Never invent or imply a name for a customer. If asked for a customer's name, explain that customer identities are not exposed to you by design.
4. When a chart would help, call one of the render_bar_chart / render_pie_chart / render_line_chart / render_number_card tools with real data from another tool's result — never describe a chart in prose only, and never draw one yourself as text/SVG.
5. Charts and lists are capped at 15 items; if asked for "all" of something, use the top 15 and say so.
6. Format written answers clearly: use **bold** for key figures and simple markdown tables (pipe-delimited) when comparing multiple rows.
7. Keep answers concise and grounded — cite the actual numbers you retrieved.`;

type ClientHistoryTurn = { role: "user" | "model"; text: string };

function isFunctionCallPart(
  p: GeminiPart
): p is { functionCall: { name: string; args: Record<string, unknown>; id?: string } } {
  return "functionCall" in p;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSession(session)) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { message?: string; history?: ClientHistoryTurn[]; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return Response.json({ error: "Message is required." }, { status: 400 });

  const modelId = body.model as GeminiModelId;
  if (!AVAILABLE_MODELS.some((m) => m.id === modelId)) {
    return Response.json({ error: "Unknown or unsupported model." }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];

  try {
    await assertWithinGuardrails();
  } catch (err) {
    if (err instanceof GuardrailError) return Response.json({ error: err.message }, { status: 429 });
    throw err;
  }

  const [orders, lines, customers, products, rentals, promotions, orderPromotions, employees] = await Promise.all([
    fetchOrders(),
    fetchOrderLines(),
    fetchCustomers(),
    fetchProducts(),
    fetchRentals(),
    fetchPromotions(),
    fetchOrderPromotions(),
    fetchEmployees(),
  ]);
  const data: AssistantData = { orders, lines, customers, products, rentals, promotions, orderPromotions, employees };

  const contents: GeminiContent[] = [
    ...history.map((h): GeminiContent => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const charts: ChartDirective[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalCostUsd = 0;
  let replyText = "";

  try {
    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      if (step > 0) {
        // Re-check guardrails on every step, since a single question can be several Gemini calls.
        await assertWithinGuardrails();
      }

      const result = await callGemini({ model: modelId, systemInstruction: SYSTEM_INSTRUCTION, contents, tools: TOOL_DECLARATIONS });
      const cost = computeCostUsd(modelId, result.promptTokens, result.completionTokens);
      totalPromptTokens += result.promptTokens;
      totalCompletionTokens += result.completionTokens;
      totalCostUsd += cost;
      await recordUsage(modelId, result.promptTokens, result.completionTokens, cost);

      const functionCalls = result.parts.filter(isFunctionCallPart);

      if (functionCalls.length === 0) {
        replyText = result.parts.map((p) => ("text" in p ? p.text : "")).join("");
        break;
      }

      contents.push({ role: "model", parts: result.parts });
      const responseParts = functionCalls.map((fc) => {
        const { result: toolResult, chart } = executeAssistantTool(fc.functionCall.name, fc.functionCall.args ?? {}, data);
        if (chart) charts.push(chart);
        return {
          functionResponse: { name: fc.functionCall.name, id: fc.functionCall.id, response: { result: toolResult } },
        };
      });
      contents.push({ role: "user", parts: responseParts });

      if (step === MAX_TOOL_STEPS - 1) {
        replyText = "I wasn't able to finish answering within the step limit — try asking a more specific question.";
      }
    }
  } catch (err) {
    if (err instanceof GuardrailError) return Response.json({ error: err.message }, { status: 429 });
    console.error("Assistant error:", err);
    return Response.json({ error: "The assistant hit an error. Please try again." }, { status: 500 });
  }

  const rateStatus = await getUsageStatus();

  return Response.json({
    reply: replyText,
    charts,
    usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, costUsd: totalCostUsd },
    rateStatus,
  });
}
