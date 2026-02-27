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

  function serializeFounder(f: typeof founders[0]) {
    return {
      ...f,
      lookingFor: JSON.parse(f.lookingFor),
      offering: JSON.parse(f.offering),
      industryTrack: JSON.parse(f.industryTrack || "[]"),
      availableSlots: JSON.parse(f.availableSlots),
      matchCount: matchCounts[f.id] || 0,
    };
  }

  function serializeMatch(s: typeof suggestions[0]) {
    return {
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
    };
  }

  // Sort suggestions: prioritize matches where at least one founder has 0 confirmed matches,
  // then by score descending. This ensures everyone gets their first match before anyone gets a second.
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const aHasUnmatched = (matchCounts[a.founderAId] || 0) === 0 || (matchCounts[a.founderBId] || 0) === 0;
    const bHasUnmatched = (matchCounts[b.founderAId] || 0) === 0 || (matchCounts[b.founderBId] || 0) === 0;

    // Both involve unmatched founders → sort by score
    if (aHasUnmatched && bHasUnmatched) return b.score - a.score;
    // Only a involves unmatched → a first
    if (aHasUnmatched) return -1;
    // Only b involves unmatched → b first
    if (bHasUnmatched) return 1;
    // Neither involves unmatched → sort by score
    return b.score - a.score;
  });

  // Sort founders: 0 matches first, then by match count ascending, then newest first
  const sortedFounders = [...founders].sort((a, b) => {
    const aCount = matchCounts[a.id] || 0;
    const bCount = matchCounts[b.id] || 0;
    if (aCount !== bCount) return aCount - bCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({
    founders: sortedFounders.map(serializeFounder),
    suggestions: sortedSuggestions.map(serializeMatch),
    confirmed: confirmed.map(serializeMatch),
    stats: {
      totalRegistrations: founders.length,
      confirmedToday,
      pendingSuggestions: suggestions.length,
      unmatchedFounders,
    },
  });
}
