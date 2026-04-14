const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const API_KEY = "AIzaSyDIL0OwZx2Bo5HlZ0C2KZ3IMcSHg535diI";
  const genAI = new GoogleGenerativeAI(API_KEY);
   const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = "Hello, this is a test. Are you working correctly as a medical triage assistant named SymptomSage?";

  try {
    console.log("Sending prompt to Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("Response from Gemini:");
    console.log(text);
  } catch (error) {
    console.error("Error testing Gemini:");
    console.error(error);
  }
}

testGemini();
