import { NextResponse } from "next/server";
import { getDfcxStatus } from "@/lib/dfcx-client";

export const runtime = "nodejs";

export async function GET() {
  const status = getDfcxStatus();
  return NextResponse.json(status);
}
