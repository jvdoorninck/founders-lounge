import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("matchmaker_auth");
  if (auth?.value !== process.env.MATCHMAKER_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId, slot } = await req.json();

  if (!matchId) {
    return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
  }

  const match = await prisma.matchSuggestion.update({
    where: { id: matchId },
    data: {
      status: "confirmed",
      confirmedAt: new Date(),
      ...(slot ? { suggestedSlot: slot } : {}),
    },
  });

  return NextResponse.json({ success: true, match });
}
