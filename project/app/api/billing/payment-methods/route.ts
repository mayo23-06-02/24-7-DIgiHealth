import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { PaymentMethod } from "@/lib/models/Billing";
import { getRequestUser } from "@/lib/auth/getRequestUser";

async function getAuthUser() {
  const requestUser = await getRequestUser();
  if (!requestUser) return null;
  return {
    _id: requestUser.userId,
    role: requestUser.role,
    email: requestUser.email,
  } as any;
}

// POST /api/billing/payment-methods - Add a new payment method
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "patient") {
      return NextResponse.json({ error: "Only patients can add payment methods" }, { status: 403 });
    }

    const body = await request.json();
    const { type, cardNumber, cardHolder, expiryMonth, expiryYear, last4, cardBrand } = body;

    if (!type || !cardNumber || !cardHolder || !expiryMonth || !expiryYear || !last4) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if this is the first payment method - if so, make it default
    const existingMethods = await PaymentMethod.find({ patientId: user._id });
    const isFirst = existingMethods.length === 0;

    const paymentMethod = await PaymentMethod.create({
      patientId: user._id,
      type,
      cardNumber, // In production, this should be encrypted/tokenized via a payment processor
      cardHolder,
      expiryMonth,
      expiryYear,
      last4,
      cardBrand,
      isDefault: isFirst,
      status: "active",
    });

    return NextResponse.json({ success: true, data: paymentMethod }, { status: 201 });
  } catch (error) {
    console.error("Error adding payment method:", error);
    return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 });
  }
}
