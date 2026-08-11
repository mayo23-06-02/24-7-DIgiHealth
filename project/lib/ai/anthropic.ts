import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic Claude client for the practitioner-facing diagnosis-support and
 * general clinical-chat features. Mirrors lib/email/postmark.ts's shape: a
 * configured-check guard plus a couple of narrow, purpose-built functions —
 * no ad hoc SDK calls scattered across routes.
 *
 * Setup: get an API key at console.anthropic.com and set ANTHROPIC_API_KEY
 * in .env.local (dev) and your Vercel project env vars (production). Model
 * id is configurable via ANTHROPIC_MODEL so it's a one-line change later,
 * not a code change.
 */

const DEFAULT_MODEL = 'claude-sonnet-5';

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface SuggestedDiagnosis {
  condition: string;
  confidence: number;
  reasoning: string;
  redFlag: boolean;
}

export interface DiagnosisSupportResult {
  diagnoses: SuggestedDiagnosis[];
  riskScore: number;
  riskAssessment: string;
  recommendedTests: string[];
  modelUsed: string;
}

const DIAGNOSIS_SYSTEM_PROMPT = `You are a clinical decision-support tool used by a licensed medical practitioner during patient consultations — you are not speaking to the patient directly, so you may use clinical terminology freely.

Your job is to suggest a DIFFERENTIAL — several possible conditions, each with your own confidence estimate — never a single definitive diagnosis. The practitioner makes the actual diagnosis; you are one input into their reasoning, not a replacement for it.

Rules:
- Always return multiple candidate conditions (typically 2-5), ranked by plausibility given the presenting symptoms and the patient's clinical context.
- Cross-check every medication-related suggestion against the patient's listed allergies. If a suggested test, treatment, or differential implicates a drug the patient is allergic to, flag that specific entry with redFlag: true and say why in the reasoning.
- If the presenting symptoms match a common emergency red-flag pattern (e.g. chest pain with radiation, sudden severe/"worst-ever" headache, signs of stroke, difficulty breathing at rest, signs of sepsis), flag the relevant entry with redFlag: true and make the urgency explicit in the reasoning — this is a triage escalation signal, not a diagnosis claim.
- If asked to simply state what to prescribe without clinical reasoning, decline that framing — provide the differential and recommended tests instead, and keep the practitioner in the decision loop.
- Base your reasoning on the symptoms described and the patient context provided (allergies, current medications, conditions, recent vitals and labs) — do not invent findings that weren't given to you.
- riskScore is 0-100 reflecting overall acuity of this presentation; riskAssessment is one short sentence summarizing it.`;

const DIAGNOSIS_TOOL: Anthropic.Tool = {
  name: 'submit_diagnosis_support',
  description: 'Submit the structured differential diagnosis and risk assessment.',
  input_schema: {
    type: 'object',
    properties: {
      diagnoses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            condition: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 100 },
            reasoning: { type: 'string' },
            redFlag: { type: 'boolean' },
          },
          required: ['condition', 'confidence', 'reasoning', 'redFlag'],
        },
      },
      riskScore: { type: 'number', minimum: 0, maximum: 100 },
      riskAssessment: { type: 'string' },
      recommendedTests: { type: 'array', items: { type: 'string' } },
    },
    required: ['diagnoses', 'riskScore', 'riskAssessment', 'recommendedTests'],
  },
};

/**
 * Requests a structured differential diagnosis from Claude, forcing tool-use
 * so the response is reliable JSON rather than parsed free text. Throws on
 * failure — a decision-support tool silently returning a plausible-looking
 * canned answer when the real API is down is worse than a clear error the
 * caller can surface to the practitioner.
 */
export async function getDiagnosisSupport(params: {
  symptoms: string;
  patientContextText: string;
}): Promise<DiagnosisSupportResult> {
  if (!isAnthropicConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to .env.local and your production env.');
  }

  const model = getModel();
  const response = await getClient().messages.create({
    model,
    max_tokens: 1536,
    system: DIAGNOSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Presenting symptoms:\n${params.symptoms}\n\nPatient clinical context:\n${params.patientContextText}`,
      },
    ],
    tools: [DIAGNOSIS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_diagnosis_support' },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );
  if (!toolUse) {
    throw new Error('Claude did not return a structured diagnosis-support response.');
  }

  const result = toolUse.input as Omit<DiagnosisSupportResult, 'modelUsed'>;
  return { ...result, modelUsed: model };
}

const CHAT_SYSTEM_PROMPT = `You are a general clinical-information assistant for a licensed medical practitioner (drug information, guideline lookups, general medical questions) — you are not speaking to a patient.

If the practitioner describes a specific patient case and asks for a diagnosis, do not give a single definitive answer in this general chat — instead point them to the patient-specific diagnosis-support tool, which has access to that patient's actual clinical record and returns a proper differential. This chat is for general information, not case-specific diagnosis.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function getChatResponse(params: {
  messages: ChatMessage[];
}): Promise<{ content: string; modelUsed: string }> {
  if (!isAnthropicConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to .env.local and your production env.');
  }

  const model = getModel();
  const response = await getClient().messages.create({
    model,
    max_tokens: 1024,
    system: CHAT_SYSTEM_PROMPT,
    messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  if (!textBlock) {
    throw new Error('Claude did not return a text response.');
  }

  return { content: textBlock.text, modelUsed: model };
}
