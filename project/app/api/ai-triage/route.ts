import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "AIzaSyDIL0OwZx2Bo5HlZ0C2KZ3IMcSHg535diI";

export async function POST(request: NextRequest) {
  try {
    const { symptoms, history } = await request.json();

    if (!symptoms || typeof symptoms !== 'string') {
      return NextResponse.json({ error: 'Symptoms are required.' }, { status: 400 });
    }

    const userInput = symptoms.toLowerCase();

    // Step 1: Build the history context for the prompt
    const conversationContext = (history || []).map((m: any) => 
        `${m.role === 'user' ? 'Patient' : 'SymptomSage'}: ${m.content}`
    ).join('\n');
    
    const prompt = `
You are "SymptomSage," a world-class AI medical diagnostic assistant for the "24/7 TeleHealth" platform.
Your expertise covers all medical disciplines including Internal Medicine, Cardiology, Neurology, and more.

STRICT PROTOCOL:
1. DISCLAIMER: Every response must start with: "**Disclaimer:** I am an AI assistant and this is for informational purposes only. Seek professional medical care for any serious concerns."
2. ANALYSIS: Provide a high-fidelity differential diagnosis. List 2-3 possible conditions that match the symptoms.
3. TRIAGE: If symptoms are severe (e.g., persistent vomiting, sharp pain, dizziness that prevents standing), mark as **URGENT** and advise immediate clinic visits.
4. COMFORT: Suggest immediate self-care (e.g., small sips of water for vomiting, dark room for headache).
5. NO DRUGS: Do not prescribe specific medications.
6. FOLLOW-UP: Ask exactly one specific clinical question to narrow down the cause.

CONVERSATION HISTORY:
${conversationContext}

CURRENT PATIENT INPUT: "${symptoms}"

Think clinically and respond with empathy.
    `;

    try {
        // Direct fetch to Gemini API for maximum stability
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 1,
              topP: 1,
              maxOutputTokens: 800,
            }
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Gemini API Error Response:", data);
            throw new Error(data.error?.message || "Gemini Direct Fetch Failed");
        }

        const aiAnalysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiAnalysis) throw new Error("Empty response from AI");

        return NextResponse.json({
            success: true,
            data: { aiAnalysis }
        });

    } catch (apiErr) {
        console.warn("AI Engine unreachable, executing SymptomSage Local Clinical Logic...");
        
        // INTELLIGENT KEYWORD FALLBACK
        let fallback = "**Disclaimer:** SymptomSage is currently in offline safety mode.\n\n";

        if (userInput.includes("vomit") || userInput.includes("nausea")) {
            fallback += "It sounds like you're experiencing gastric distress. **Immediate Action:** Please try to take very small sips of water or an electrolyte solution to prevent dehydration. **Analysis:** This could be viral gastroenteritis or food poisoning. **Follow-up:** Are you able to keep any liquids down, and do you have a fever?";
        } else if (userInput.includes("headache") || userInput.includes("dizzy")) {
            fallback += "Headaches combined with dizziness require monitoring. **Immediate Action:** Please rest in a quiet, dark room and check your hydration. **Analysis:** This could be a tension headache or early signs of a viral infection. **Follow-up:** Did the symptoms start suddenly, and do you have any neck stiffness?";
        } else {
            fallback += "I've noted your symptoms of '" + symptoms + "'. **General Advice:** Stay hydrated and monitor your temperature. **Next Step:** If symptoms persist for more than 12 hours or worsen, please use the 'Book Consult' button to speak with a doctor. **Follow-up:** How long has this been bothering you?";
        }

        return NextResponse.json({
            success: true,
            data: { aiAnalysis: fallback }
        });
    }

  } catch (error) {
    console.error('Final Crash Boundary in AI Route:', error);
    return NextResponse.json({ error: 'System Error. Please try again.' }, { status: 500 });
  }
}
