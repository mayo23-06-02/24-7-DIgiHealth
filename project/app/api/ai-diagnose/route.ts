import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Get symptoms and patient info from the request body
    const { symptoms, age, gender } = await request.json();

    // 2. Validate input (e.g., ensure symptoms array is not empty)
    if (!symptoms || symptoms.length === 0) {
      return NextResponse.json({ error: 'Symptoms are required.' }, { status: 400 });
    }

    // 3. Call the Medius Disease Prediction API on RapidAPI
    const url = 'https://medius-disease-prediction.p.rapidapi.com/predict';
    const options = {
      method: 'POST',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '', // Store your key in .env.local
        'x-rapidapi-host': 'medius-disease-prediction.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symptoms: symptoms,
        patientInfo: {
          age: age,
          gender: gender
        }
      })
    };

    // Note: If no API key is provided, we can mock the response so the UI still works.
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json({
        possibleConditions: [
          { disease: "Common Cold", snomedId: "82272006", confidence: 0.89 },
          { disease: "Seasonal Allergies", snomedId: "418654009", confidence: 0.65 },
          { disease: "Influenza", snomedId: "6142004", confidence: 0.42 },
        ]
      }, { status: 200 });
    }

    const response = await fetch(url, options);
    const data = await response.json();

    // 4. Return the structured diagnosis data to the client
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Diagnosis API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
