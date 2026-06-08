"use server";

import { ANTHROPIC_MODEL, getAnthropic, isAiEnabled } from "@/lib/ai/client";
import { formatContactForPrompt } from "@/lib/ai/contact-context";
import { formatDealForPrompt, loadDealContext } from "@/lib/ai/deal-context";
import {
  formatOrderForPrompt,
  formatPurchaseOrderForPrompt,
  loadOrderContext,
  loadPurchaseOrderContext,
} from "@/lib/ai/order-context";
import { getActiveWorkspace } from "@/lib/tenant";

type Ok = { ok: true; text: string };
type Err = { ok: false; error: string };
export type AiResult = Ok | Err;

const SUMMARIZE_SYSTEM = `You are a sales operations analyst embedded inside an ERP. \
The user is opening a CRM deal and wants a quick situational read. \
Reply in 2–3 short sentences covering: (1) where the deal stands, (2) what is blocking or risky, \
(3) the next concrete action. Be direct, no fluff, no greetings. Match the user's language if it is not English.`;

const ACCOUNT_BRIEF_SYSTEM = `You are a sales operations analyst producing a one-page account brief for a sales rep walking into a customer meeting. \
Reply in this exact structure (markdown not required, plain text is fine):

State of the account: <2–3 sentences on health, momentum, recent signals>
Open opportunities: <bulleted list of named deals with stage + value + risk>
Risks & blockers: <2–3 short bullets, or "None identified" if truly clean>
Recommended next moves: <3 numbered concrete actions the rep can do this week>

Be specific and grounded in the data provided. Do not invent numbers or commitments. \
Match the language of the input notes if not English.`;

const RFQ_EMAIL_SYSTEM = `You are a procurement specialist sending a Request for Quotation (RFQ) to a vendor. \
Format the reply as:
Subject: <subject line that includes the PO number>
<one blank line>
<email body, 5–9 short lines>

Constraints:
- Open with "Hi {vendor contact first name}" — use the contact person from context, or "Hello" if none.
- Briefly state what you're requesting (reference 1–2 of the line items).
- Ask for: best pricing, lead time, and shipping options.
- Mention the expected need-by date if present.
- Close politely with a deadline for the quote (e.g. "within 5 business days").
- Sign off with the owner's first name from context, or "{workspace} procurement team".
- The PDF version of the request is attached — don't duplicate the line items.
- Match the language of the vendor's name if not English.`;

const QUOTE_EMAIL_SYSTEM = `You are a sales rep sending a quote to a customer. \
The PDF version of the quote is attached to the email — your job is the cover note.

Format the reply as:
Subject: <subject line that includes the quote number>
<one blank line>
<email body, 5–9 short lines>

Constraints:
- Open with "Hi {first name}" — use the customer's first name from the context.
- One sentence summarizing what the quote is for (reference 1–2 of the line items).
- One sentence on the total and the expected delivery / validity if available.
- One sentence inviting questions and offering a quick call.
- Sign off with the sales rep's first name (from the Owner field) — or just "the {workspace} team" if no owner.
- Do not duplicate the line items — the PDF has them.
- Do not invent prices, dates, terms, or discounts not in the context.
- Match the language of the customer's company name and internal notes if those are not English.`;

const DRAFT_EMAIL_SYSTEM = `You are a sales rep drafting a polite, concise follow-up email to a prospect. \
Format the reply as:
Subject: <subject line>
<one blank line>
<email body, 4–8 short lines>

Constraints:
- Reference one specific detail from the deal context (recent activity, blocker, or value).
- End with a clear next step (calendar suggestion, decision request, or document attached).
- No salutations like "Dear Sir/Madam" — open with "Hi {first name}".
- Match the language of the user's deal notes if those are not in English.
- Do not invent prices, dates, or commitments not present in the context.`;

export async function summarizeDeal(dealId: string): Promise<AiResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY in .env.local." };
  }
  const ws = await getActiveWorkspace();
  const ctx = await loadDealContext(ws.id, dealId);
  if (!ctx) return { ok: false, error: "Deal not found" };

  const anthropic = await getAnthropic();
  if (!anthropic) return { ok: false, error: "AI client unavailable" };

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 350,
      system: SUMMARIZE_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Deal context:\n\n${formatDealForPrompt(ctx)}\n\nSummarize where this deal stands and what to do next.`,
        },
      ],
    });
    const text = extractText(response);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function draftFollowUpEmail(dealId: string): Promise<AiResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY in .env.local." };
  }
  const ws = await getActiveWorkspace();
  const ctx = await loadDealContext(ws.id, dealId);
  if (!ctx) return { ok: false, error: "Deal not found" };
  if (!ctx.contact) {
    return { ok: false, error: "Add a contact to this deal first." };
  }

  const anthropic = await getAnthropic();
  if (!anthropic) return { ok: false, error: "AI client unavailable" };

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system: DRAFT_EMAIL_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Draft a follow-up email to ${ctx.contact.name} based on this deal:\n\n${formatDealForPrompt(ctx)}`,
        },
      ],
    });
    const text = extractText(response);
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function generateAccountBrief(contactId: string): Promise<AiResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY in .env.local." };
  }
  const ws = await getActiveWorkspace();
  const prompt = await formatContactForPrompt(ws.id, contactId);
  if (!prompt) return { ok: false, error: "Customer not found" };

  const anthropic = await getAnthropic();
  if (!anthropic) return { ok: false, error: "AI client unavailable" };

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 800,
      system: ACCOUNT_BRIEF_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Produce an account brief based on this data:\n\n${prompt}`,
        },
      ],
    });
    return { ok: true, text: extractText(response) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function draftRfqEmail(
  orderId: string,
  workspaceName: string,
): Promise<AiResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY in .env.local." };
  }
  const ws = await getActiveWorkspace();
  const ctx = await loadPurchaseOrderContext(ws.id, orderId);
  if (!ctx) return { ok: false, error: "Purchase order not found" };
  if (!ctx.vendor?.email) {
    return { ok: false, error: "This vendor has no email on file." };
  }

  const anthropic = await getAnthropic();
  if (!anthropic) return { ok: false, error: "AI client unavailable" };

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system: RFQ_EMAIL_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Draft the RFQ email for this purchase order. Workspace name: ${workspaceName}.\n\n${formatPurchaseOrderForPrompt(ctx)}`,
        },
      ],
    });
    return { ok: true, text: extractText(response) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function draftQuoteEmail(
  orderId: string,
  workspaceName: string,
): Promise<AiResult> {
  if (!isAiEnabled()) {
    return { ok: false, error: "AI is not configured. Set ANTHROPIC_API_KEY in .env.local." };
  }
  const ws = await getActiveWorkspace();
  const ctx = await loadOrderContext(ws.id, orderId);
  if (!ctx) return { ok: false, error: "Order not found" };
  if (!ctx.customer?.email) {
    return { ok: false, error: "This customer has no email on file." };
  }

  const anthropic = await getAnthropic();
  if (!anthropic) return { ok: false, error: "AI client unavailable" };

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system: QUOTE_EMAIL_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Draft the cover email for this quote. Workspace name: ${workspaceName}.\n\n${formatOrderForPrompt(ctx)}`,
        },
      ],
    });
    return { ok: true, text: extractText(response) };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function extractText(response: { content: { type: string; text?: string }[] }): string {
  const parts = response.content
    .filter((c): c is { type: "text"; text: string } => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text);
  return parts.join("\n").trim();
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error from AI service";
}
