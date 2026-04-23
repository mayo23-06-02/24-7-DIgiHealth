// app/api/ai/diagnose/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Use environment variables for security (add to .env.local)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "8dcf67791emsh10971028d26f5c2p1ecdd9jsn30ed1243d792";
const RAPIDAPI_HOST = "ai-doctor-api-ai-medical-chatbot-healthcare-ai-assistant.p.rapidapi.com";

export async function POST(request: NextRequest) {
  try {
    const { symptoms, age, gender, history = [] } = await request.json();

    if (!symptoms || typeof symptoms !== 'string') {
      return NextResponse.json({ error: 'Symptoms are required.' }, { status: 400 });
    }

    // Build a comprehensive message with patient context and conversation history
    let message = `Patient age: ${age || 'unknown'}, Gender: ${gender || 'not specified'}. `;
    
    if (history.length > 0) {
      // Include last 2 exchanges for context
      const lastExchanges = history.slice(-4).map((m: any) => 
        `${m.role === 'user' ? 'Patient' : 'Doctor'}: ${m.content}`
      ).join(' ');
      message += `Previous conversation: ${lastExchanges}. `;
    }
    
    message += `Current symptoms: ${symptoms}. `;
    message += `Please act as a compassionate AI doctor (Dr. SymtoSage). Follow these guidelines:
1. Start with a disclaimer: "**Disclaimer:** I'm an AI assistant, not a real doctor. This information is for educational purposes only."
2. Acknowledge the patient's symptoms with empathy.
3. Provide 2-3 possible conditions that could explain the symptoms.
4. Clearly state if symptoms sound like a medical emergency.
5. Give 1-2 practical self-care tips.
6. End by asking one specific follow-up question.`;

    // Call the RapidAPI AI Doctor API
    const url = `https://${RAPIDAPI_HOST}/chat?noqueue=1`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
      body: JSON.stringify({
        message: message,
        specialization: "general_practice",
        language: "en"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI error:', response.status, errorText);
      return NextResponse.json(
        { error: `AI service temporarily unavailable (${response.status}). Please try again.` },
        { status: response.status }
      );
    }

    const data = await response.json();
    // The API returns a response in `data.response` (based on typical RapidAPI medical chatbots)
    const aiAnalysis = data.response || data.message || data.reply;
    
    if (!aiAnalysis) {
      console.error('Unexpected API response structure:', data);
      return NextResponse.json(
        { error: 'Empty response from AI. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: { aiAnalysis } });
  } catch (error: any) {
    console.error('AI diagnose error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}