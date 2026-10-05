import { NextRequest } from "next/server";
import { handleImportUpload } from "@/lib/provisioning/importRoute";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleImportUpload(req, (await params).id, "patients");
}
