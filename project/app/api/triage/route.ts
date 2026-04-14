import { NextResponse } from "next/server";

// This is a placeholder backend for the AI Triage Symptom Checker.
// To integrate with a real RapidAPI (e.g., Infermedica or Endless Medical API):
// 1. Sign up on RapidAPI and subscribe to a symptom checker API.
// 2. Add your RAPIDAPI_KEY to your .env.local file.
// 3. Replace the mock logic below with a fetch request to the RapidAPI endpoint.

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: "Please describe your symptoms so I can assist you." }, { status: 400 });
    }

    const userInput = message.toLowerCase();

    // --------------------------------------------------------------------------
    // MOCK TRIAGE LOGIC (General Medical Disciplines)
    // --------------------------------------------------------------------------
    let reply = "Based on your description, I cannot make a specific recommendation. Please consult a general practitioner or use the 'Book Consult' feature on your dashboard.";

    // Cardiology
    if (userInput.includes("chest") || userInput.includes("heart") || userInput.includes("palpitations") || userInput.includes("breath")) {
      reply = "🚨 **Cardiology Triage Alert**: Chest pain, shortness of breath, or palpitations can be signs of a cardiovascular issue. If the pain is severe or radiating to your arm or jaw, call emergency services immediately (112 or 10177). Otherwise, please schedule an urgent Cardiology consultation.";
    } 
    // Neurology
    else if (userInput.includes("headache") || userInput.includes("migraine") || userInput.includes("dizzy") || userInput.includes("numb") || userInput.includes("vision")) {
      reply = "🧠 **Neurology Triage**: Headaches with dizziness, numbness, or vision changes require neurological evaluation. If you are experiencing sudden severe numbness on one side of your body, seek emergency care immediately as it may signify a stroke.";
    } 
    // Dermatology
    else if (userInput.includes("rash") || userInput.includes("skin") || userInput.includes("itch") || userInput.includes("mole")) {
      reply = "🔬 **Dermatology Triage**: Skin symptoms like rashes or persistent itching can be related to allergies or infections. I recommend uploading a picture of the affected area in a Dermatology consultation.";
    } 
    // Orthopedics
    else if (userInput.includes("bone") || userInput.includes("joint") || userInput.includes("knee") || userInput.includes("back") || userInput.includes("pain")) {
      reply = "🦴 **Orthopedics Triage**: Joint or bone pain could suggest musculoskeletal strain or injury. Rest, ice, and elevation are recommended initially. Please book an Orthopedic consult if the pain is severe or restricts movement.";
    }
    // Gastroenterology / Internal Medicine
    else if (userInput.includes("stomach") || userInput.includes("nausea") || userInput.includes("vomit") || userInput.includes("diarrhea")) {
      reply = "🦠 **Gastroenterology Triage**: Digestive symptoms can lead to dehydration. Ensure you drink plenty of fluids. If symptoms persist for more than 48 hours or you notice blood, schedule an Internal Medicine consult.";
    }
    // General / Pediatrics / Infection
    else if (userInput.includes("fever") || userInput.includes("cough") || userInput.includes("cold") || userInput.includes("flu")) {
      reply = "🌡️ **General Medicine Triage**: A fever and cough are typical signs of a viral infection (like the flu or COVID-19). Please isolate, rest, and hydrate. An online tele-consultation is highly recommended to receive a prescription if necessary.";
    }

    // Simulate API delay (1.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Return the response. 
    // Once you have a RapidAPI account, you will return the actual RapidAPI response here.
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Triage API Error:", error);
    return NextResponse.json({ reply: "An error occurred while processing your symptoms. Please try again." }, { status: 500 });
  }
}
