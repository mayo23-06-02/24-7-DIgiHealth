import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/api/errors";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symptoms } = body;

    if (!symptoms) {
      return NextResponse.json({ success: false, error: "Symptoms are required" }, { status: 400 });
    }

    // MOCK AI LOGIC
    // In a real app, this would call Gemini, Medius, or another medical AI service
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI latency

    const mockResults = {
      differentialDiagnosis: [
        {
          condition: "Acute Viral Respiratory Infection",
          confidence: 85,
          description: "A common viral infection of the nose and throat. Symptoms typically include cough, sore throat, and low-grade fever. Self-limiting in most cases."
        },
        {
          condition: "Allergic Rhinitis",
          confidence: 65,
          description: "An allergic response to specific allergens. Symptoms include sneezing, itchy eyes, and nasal congestion without fever."
        },
        {
          condition: "Bacterial Sinusitis",
          confidence: 40,
          description: "Infection of the sinuses usually following a viral cold. Characterized by facial pain, thick nasal discharge, and symptoms lasting more than 10 days."
        }
      ],
      riskScore: 25,
      riskAssessment: "Low risk. No red flags detected in current presentation.",
      recommendedActions: [
        "Full Blood Count (FBC) to rule out bacterial infection",
        "Monitor temperature for next 48 hours",
        "Supportive care with hydration and rest"
      ],
      clinicalGuidelines: "According to NICE guidelines for respiratory infections, antibiotics should be withheld unless symptoms worsen or persist beyond 10 days."
    };

    return NextResponse.json({ success: true, data: mockResults });
  } catch (err: any) {
    return apiError(err);
  }
}
