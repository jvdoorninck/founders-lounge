import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("matchmaker_auth");
  if (auth?.value !== process.env.MATCHMAKER_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const founders = await prisma.founder.findMany({
    orderBy: { createdAt: "desc" },
  });

  const suggestions = await prisma.matchSuggestion.findMany({
    where: { status: "suggested" },
    include: { founderA: true, founderB: true },
    orderBy: { score: "desc" },
  });

  const confirmed = await prisma.matchSuggestion.findMany({
    where: { status: "confirmed" },
    include: { founderA: true, founderB: true },
    orderBy: { confirmedAt: "desc" },
  });

  // Count confirmed matches per founder
  const matchCounts: Record<string, number> = {};
  for (const m of confirmed) {
    matchCounts[m.founderAId] = (matchCounts[m.founderAId] || 0) + 1;
    matchCounts[m.founderBId] = (matchCounts[m.founderBId] || 0) + 1;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const confirmedToday = confirmed.filter(
    (m) => m.confirmedAt && new Date(m.confirmedAt) >= today
  ).length;

  const unmatchedFounders = founders.filter((f) => !matchCounts[f.id]).length;

  return NextResponse.json({
    founders: founders.map((f) => ({
      ...f,
      lookingFor: JSON.parse(f.lookingFor),
      offering: JSON.parse(f.offering),
      availableSlots: JSON.parse(f.availableSlots),
      matchCount: matchCounts[f.id] || 0,
    })),
    suggestions: suggestions.map((s) => ({
      ...s,
      founderA: {
        ...s.founderA,
        lookingFor: JSON.parse(s.founderA.lookingFor),
        offering: JSON.parse(s.founderA.offering),
        availableSlots: JSON.parse(s.founderA.availableSlots),
      },
      founderB: {
        ...s.founderB,
        lookingFor: JSON.parse(s.founderB.lookingFor),
        offering: JSON.parse(s.founderB.offering),
        availableSlots: JSON.parse(s.founderB.availableSlots),
      },
    })),
    confirmed: confirmed.map((s) => ({
      ...s,
      founderA: {
        ...s.founderA,
        lookingFor: JSON.parse(s.founderA.lookingFor),
        offering: JSON.parse(s.founderA.offering),
        availableSlots: JSON.parse(s.founderA.availableSlots),
      },
      founderB: {
        ...s.founderB,
        lookingFor: JSON.parse(s.founderB.lookingFor),
        offering: JSON.parse(s.founderB.offering),
        availableSlots: JSON.parse(s.founderB.availableSlots),
      },
    })),
    stats: {
      totalRegistrations: founders.length,
      confirmedToday,
      pendingSuggestions: suggestions.length,
      unmatchedFounders,
    },
  });
}
