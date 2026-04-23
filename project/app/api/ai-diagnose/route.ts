// app/api/ai/diagnose/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { symptoms, age, gender, history = [] } = await request.json();

    if (!symptoms || typeof symptoms !== 'string') {
      return NextResponse.json({ error: 'Symptoms are required.' }, { status: 400 });
    }

    // Build conversation context from history
    const conversationContext = history
      .map((m: any) => `${m.role === 'user' ? 'Patient' : 'Dr. SymtoSage'}: ${m.content}`)
      .join('\n');

    const prompt = `
You are "Dr. SymtoSage", a world‑class AI medical diagnostician for the "24/7 TeleHealth" platform.
Your expertise covers all medical disciplines: Internal Medicine, Cardiology, Neurology, Paediatrics, etc.
Respond with the authority, empathy, and clarity of an experienced physician.

STRICT PROTOCOL:
1. **DISCLAIMER** – Every response MUST start with:  
   "**Disclaimer:** I am Dr. SymtoSage, an AI medical assistant. This information is for educational purposes only. Always seek professional medical care for serious concerns."

2. **DIFFERENTIAL DIAGNOSIS** – Provide 2–3 possible conditions that match the symptoms, ranked by likelihood.

3. **TRIAGE URGENCY** – If symptoms are severe (e.g., chest pain, difficulty breathing, severe bleeding, loss of consciousness, persistent vomiting, high fever with stiff neck), label as **URGENT** and advise immediate clinic or ER visit.

4. **SELF‑CARE ADVICE** – Suggest safe, non‑pharmacological measures (e.g., rest, hydration, cool compress, dark room).

5. **NO PRESCRIPTIONS** – Never recommend specific medications or dosages.

6. **FOLLOW‑UP** – Ask exactly ONE specific clinical question to narrow down the cause.

PATIENT INFO:
- Age: ${age || 'unknown'}
- Gender: ${gender || 'not specified'}

CONVERSATION HISTORY:
${conversationContext || 'None'}

CURRENT PATIENT INPUT: "${symptoms}"

Now think clinically and respond as Dr. SymtoSage.
    `;

    // Helper to call Gemini
    async function callGemini() {
      if (!GEMINI_API_KEY) throw new Error('Missing Gemini API key');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 1,
              topP: 1,
              maxOutputTokens: 800,
            },
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    }

    let aiAnalysis: string;
    try {
      aiAnalysis = await callGemini();
    } catch (geminiError) {
      console.warn('Gemini unavailable, using fallback logic:', geminiError);
      aiAnalysis = generateFallbackAnalysis(symptoms);
    }

    return NextResponse.json({ success: true, data: { aiAnalysis } });
  } catch (error) {
    console.error('AI diagnose route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------- Intelligent Fallback (no AI) ----------
function generateFallbackAnalysis(symptoms: string): string {
  const userInput = symptoms.toLowerCase();
  let analysis = '**Disclaimer:** Dr. SymtoSage is currently in offline safety mode. ' +
                 'This information is for educational purposes only.\n\n';

  if (userInput.includes('vomit') || userInput.includes('nausea')) {
    analysis += '**Differential Diagnosis:** Viral gastroenteritis, food poisoning, or morning sickness (if applicable).\n\n' +
                '**Triage:** If you cannot keep any liquids down for >12 hours or see blood in vomit, seek medical attention.\n\n' +
                '**Self‑care:** Take very small sips of water or an electrolyte solution every 10 minutes. Avoid solid foods until vomiting stops.\n\n' +
                '**Follow‑up:** Do you have a fever or abdominal pain?';
  } else if (userInput.includes('headache') || userInput.includes('dizzy')) {
    analysis += '**Differential Diagnosis:** Tension headache, migraine, or dehydration.\n\n' +
                '**Triage:** If headache is sudden and severe (“thunderclap”) or accompanied by confusion, slurred speech, or weakness, go to ER immediately.\n\n' +
                '**Self‑care:** Rest in a dark, quiet room; apply a cool cloth to forehead; stay hydrated.\n\n' +
                '**Follow‑up:** Is the headache one‑sided or pounding? Any neck stiffness?';
  } else if (userInput.includes('chest') || userInput.includes('breath')) {
    analysis += '**Differential Diagnosis:** Anxiety, musculoskeletal pain, or cardiac issue.\n\n' +
                '**Triage:** **URGENT** – Chest pain with shortness of breath requires immediate evaluation. Call emergency services or go to nearest ER.\n\n' +
                '**Self‑care:** Sit upright and try to remain calm. Do not drive yourself.\n\n' +
                '**Follow‑up:** Does the pain radiate to your arm or jaw?';
  } else {
    analysis += '**Differential Diagnosis:** Non‑specific viral syndrome or mild allergic reaction.\n\n' +
                '**Triage:** Monitor symptoms for the next 24 hours. If they worsen, use the “Book Consult” button.\n\n' +
                '**Self‑care:** Rest, drink fluids, and avoid strenuous activity.\n\n' +
                '**Follow‑up:** How long have these symptoms been present?';
  }
  return analysis;
}