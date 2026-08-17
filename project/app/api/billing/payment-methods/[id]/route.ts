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

// DELETE /api/billing/payment-methods/:id - Delete a payment method
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "patient") {
      return NextResponse.json({ error: "Only patients can delete payment methods" }, { status: 403 });
    }

    const { id } = await params;

    await connectToDatabase();

    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    // Verify the payment method belongs to the user
    if (paymentMethod.patientId.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await PaymentMethod.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json({ error: "Failed to delete payment method" }, { status: 500 });
  }
}
