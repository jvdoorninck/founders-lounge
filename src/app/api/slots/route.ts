import { NextResponse } from "next/server";
import { getEventSlots } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({ slots: getEventSlots() });
}
