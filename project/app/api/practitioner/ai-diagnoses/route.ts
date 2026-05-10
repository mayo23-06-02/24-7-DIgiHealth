import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // MOCK DATA
  const mockHistory = [
    {
      id: "diag_1",
      date: new Date(Date.now() - 86400000).toISOString(),
      patientName: "John Doe",
      topCondition: "Hypertension Stage 1",
      riskScore: 65,
    },
    {
      id: "diag_2",
      date: new Date(Date.now() - 172800000).toISOString(),
      patientName: "Jane Smith",
      topCondition: "Gastroenteritis",
      riskScore: 35,
    },
    {
      id: "diag_3",
      date: new Date(Date.now() - 259200000).toISOString(),
      patientName: "Alice Walker",
      topCondition: "Type 2 Diabetes Mellitus",
      riskScore: 82,
    }
  ];

  return NextResponse.json({ success: true, data: mockHistory });
}
