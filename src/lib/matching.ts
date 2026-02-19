import { prisma } from "@/lib/db";
import { COMPLEMENTARY_PAIRS, PHASE_ORDER, TOPIC_LABELS } from "@/lib/constants";

interface FounderData {
  id: string;
  name: string;
  companyPhase: string;
  industry: string | null;
  lookingFor: string[];
  offering: string[];
  availableSlots: string[];
}

function parseFounder(f: {
  id: string;
  name: string;
  companyPhase: string;
  industry: string | null;
  lookingFor: string;
  offering: string;
  availableSlots: string;
}): FounderData {
  return {
    ...f,
    lookingFor: JSON.parse(f.lookingFor),
    offering: JSON.parse(f.offering),
    availableSlots: JSON.parse(f.availableSlots),
  };
}

function getComplementaryScore(a: FounderData, b: FounderData): { score: number; pairs: [string, string][]; aToBPairs: [string, string][]; bToAPairs: [string, string][] } {
  const aToBPairs: [string, string][] = [];
  const bToAPairs: [string, string][] = [];

  // Check A's needs vs B's offerings
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (a.lookingFor.includes(need) && b.offering.includes(offer)) {
      aToBPairs.push([need, offer]);
    }
  }
  // Check B's needs vs A's offerings
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (b.lookingFor.includes(need) && a.offering.includes(offer)) {
      bToAPairs.push([need, offer]);
    }
  }

  const allPairs = [...aToBPairs];
  for (const [need, offer] of bToAPairs) {
    if (!allPairs.some(([n, o]) => n === need && o === offer)) {
      allPairs.push([need, offer]);
    }
  }

  const aToBCount = aToBPairs.length;
  const bToACount = bToAPairs.length;

  let score = 0;
  const totalMatches = aToBCount + bToACount;
  if (totalMatches === 0) return { score: 0, pairs: [], aToBPairs: [], bToAPairs: [] };

  const bidirectional = Math.min(aToBCount, bToACount) > 0;
  if (bidirectional) {
    score = Math.min(40, 10 + totalMatches * 5);
  } else {
    score = Math.min(25, totalMatches * 10);
  }

  return { score, pairs: allPairs, aToBPairs, bToAPairs };
}

function getAvailabilityScore(a: FounderData, b: FounderData): { score: number; overlapping: string[] } {
  const overlapping = a.availableSlots.filter((s) => b.availableSlots.includes(s));
  if (overlapping.length === 0) return { score: 0, overlapping: [] };
  if (overlapping.length === 1) return { score: 15, overlapping };
  if (overlapping.length === 2) return { score: 25, overlapping };
  return { score: 30, overlapping };
}

function getPhaseScore(a: FounderData, b: FounderData): number {
  const aSeeksAdvice = a.lookingFor.includes("Advice from someone further in the journey");
  const bOffersAdvice = b.offering.includes("Been there, open to give advice");
  const bSeeksAdvice = b.lookingFor.includes("Advice from someone further in the journey");
  const aOffersAdvice = a.offering.includes("Been there, open to give advice");

  const aPhase = PHASE_ORDER[a.companyPhase] ?? 2;
  const bPhase = PHASE_ORDER[b.companyPhase] ?? 2;

  if (
    (aSeeksAdvice && bOffersAdvice && bPhase > aPhase) ||
    (bSeeksAdvice && aOffersAdvice && aPhase > bPhase)
  ) {
    return 15;
  }

  const distance = Math.abs(aPhase - bPhase);
  if (distance === 0) return 15;
  if (distance === 1) return 10;
  if (distance === 2) return 5;
  return 0;
}

function getIndustryScore(a: FounderData, b: FounderData): number {
  if (!a.industry || !b.industry) return 0;
  if (a.industry === "unknown" || b.industry === "unknown") return 0;

  const aInd = a.industry.toLowerCase();
  const bInd = b.industry.toLowerCase();

  if (aInd === bInd) return 15;

  const techRelated = ["saas", "b2b software", "developer tools", "ai/ml", "devtools", "api"];
  const consumerRelated = ["consumer app", "e-commerce", "marketplace", "d2c"];
  const financeRelated = ["fintech", "insurtech", "banking", "payments"];
  const healthRelated = ["healthcare", "healthtech", "biotech", "medtech"];
  const groups = [techRelated, consumerRelated, financeRelated, healthRelated];

  for (const group of groups) {
    if (group.some((t) => aInd.includes(t)) && group.some((t) => bInd.includes(t))) {
      return 10;
    }
  }

  return 0;
}

function generateMatchmakerReason(
  a: FounderData,
  b: FounderData,
  aToBPairs: [string, string][],
  bToAPairs: [string, string][],
  overlapping: string[]
): string {
  const parts: string[] = [];

  // Complementary interest explanation
  if (aToBPairs.length > 0 && bToAPairs.length > 0) {
    const aNeeds = aToBPairs.map(([need]) => TOPIC_LABELS[need] || need).slice(0, 2).join(" & ");
    const bNeeds = bToAPairs.map(([need]) => TOPIC_LABELS[need] || need).slice(0, 2).join(" & ");
    parts.push(`Two-way match: ${a.name.split(" ")[0]} wants ${aNeeds}, ${b.name.split(" ")[0]} wants ${bNeeds}`);
  } else if (aToBPairs.length > 0) {
    const aNeeds = aToBPairs.map(([need]) => TOPIC_LABELS[need] || need).slice(0, 2).join(" & ");
    parts.push(`${a.name.split(" ")[0]} wants ${aNeeds} and ${b.name.split(" ")[0]} can offer that`);
  } else if (bToAPairs.length > 0) {
    const bNeeds = bToAPairs.map(([need]) => TOPIC_LABELS[need] || need).slice(0, 2).join(" & ");
    parts.push(`${b.name.split(" ")[0]} wants ${bNeeds} and ${a.name.split(" ")[0]} can offer that`);
  }

  // Industry
  if (a.industry && b.industry && a.industry !== "unknown" && b.industry !== "unknown") {
    if (a.industry.toLowerCase() === b.industry.toLowerCase()) {
      parts.push(`Same industry (${a.industry})`);
    }
  }

  // Phase
  const aPhase = PHASE_ORDER[a.companyPhase] ?? 2;
  const bPhase = PHASE_ORDER[b.companyPhase] ?? 2;
  if (aPhase === bPhase) {
    parts.push(`Both ${a.companyPhase}`);
  } else if (Math.abs(aPhase - bPhase) <= 1) {
    parts.push(`Similar phase`);
  }

  // Availability
  parts.push(`${overlapping.length} overlapping slot${overlapping.length > 1 ? "s" : ""}`);

  return parts.join(". ");
}

function generateReason(
  recipient: FounderData,
  other: FounderData,
): string {
  // Find what the recipient is looking for that the other offers
  const recipientMatches: [string, string][] = [];
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (recipient.lookingFor.includes(need) && other.offering.includes(offer)) {
      recipientMatches.push([need, offer]);
    }
  }

  // Co-founder match
  if (
    recipient.lookingFor.includes("Find a potential co-founder") &&
    other.offering.includes("Interested in becoming a co-founder")
  ) {
    return "You're both exploring the co-founder route — worth a conversation.";
  }

  // Advice match
  if (
    recipient.lookingFor.includes("Advice from someone further in the journey") &&
    other.offering.includes("Been there, open to give advice")
  ) {
    return "Your match has been through the stage you're in now and is happy to share what they've learned.";
  }

  // Feedback match
  if (
    recipient.lookingFor.includes("Receive candid feedback") &&
    other.offering.includes("Honest feedback")
  ) {
    return "Your match signed up specifically to give candid feedback — exactly what you asked for.";
  }

  // Peer conversation + similar phase
  if (
    recipient.lookingFor.includes("Peer conversation / share experiences") &&
    other.offering.includes("Peer conversation / share experiences")
  ) {
    const recipientPhase = PHASE_ORDER[recipient.companyPhase] ?? 2;
    const otherPhase = PHASE_ORDER[other.companyPhase] ?? 2;
    if (recipientPhase === otherPhase) {
      return `You're both ${recipient.companyPhase} founders — great for an honest peer conversation.`;
    }
    if (Math.abs(recipientPhase - otherPhase) <= 1) {
      return "Your match is at a similar stage — great for an honest peer conversation.";
    }
  }

  // Generic complementary match (pick first one)
  if (recipientMatches.length > 0) {
    const [need] = recipientMatches[0];
    const topicLabel = TOPIC_LABELS[need] || need.toLowerCase();

    if (recipientMatches.length > 1) {
      const [need2] = recipientMatches[1];
      const topicLabel2 = TOPIC_LABELS[need2] || need2.toLowerCase();
      return `You're looking for ${topicLabel} and ${topicLabel2}, and your match has experience in both areas.`;
    }

    return `You're looking for ${topicLabel}, and your match has deep experience in exactly that area.`;
  }

  // Fallback: check what the other is looking for that the recipient offers
  const otherMatches: string[] = [];
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (other.lookingFor.includes(need) && recipient.offering.includes(offer)) {
      otherMatches.push(offer);
    }
  }

  if (otherMatches.length > 0) {
    const label = TOPIC_LABELS[otherMatches[0]] || otherMatches[0].toLowerCase();
    return `Your match is looking for someone with your expertise in ${label} — this could be a great conversation.`;
  }

  return "We think you two would have a great conversation based on your complementary backgrounds.";
}

interface ScoredPair {
  a: FounderData;
  b: FounderData;
  totalScore: number;
  complementaryScore: number;
  aToBPairs: [string, string][];
  bToAPairs: [string, string][];
  overlapping: string[];
  suggestedSlot: string;
}

export async function runMatching(): Promise<{ generated: number }> {
  const allFounders = await prisma.founder.findMany();
  const founders = allFounders.map(parseFounder);

  // Get existing match pairs (to avoid duplicates) — any status
  const existingMatches = await prisma.matchSuggestion.findMany({
    select: { founderAId: true, founderBId: true },
  });
  const existingPairs = new Set(
    existingMatches.map((m) => [m.founderAId, m.founderBId].sort().join("|"))
  );

  // Get active matches (suggested or confirmed) to count per-founder allocation
  const activeMatches = await prisma.matchSuggestion.findMany({
    where: { status: { in: ["suggested", "confirmed"] } },
    select: { founderAId: true, founderBId: true, suggestedSlot: true, status: true },
  });

  // Count how many active matches (suggested + confirmed) each founder already has
  const activeCount: Record<string, number> = {};
  // Count only confirmed
  const confirmedCount: Record<string, number> = {};
  // Track used slots from confirmed matches
  const usedSlots: Record<string, Set<string>> = {};

  for (const m of activeMatches) {
    activeCount[m.founderAId] = (activeCount[m.founderAId] || 0) + 1;
    activeCount[m.founderBId] = (activeCount[m.founderBId] || 0) + 1;
    if (m.status === "confirmed") {
      confirmedCount[m.founderAId] = (confirmedCount[m.founderAId] || 0) + 1;
      confirmedCount[m.founderBId] = (confirmedCount[m.founderBId] || 0) + 1;
      if (!usedSlots[m.founderAId]) usedSlots[m.founderAId] = new Set();
      if (!usedSlots[m.founderBId]) usedSlots[m.founderBId] = new Set();
      usedSlots[m.founderAId].add(m.suggestedSlot);
      usedSlots[m.founderBId].add(m.suggestedSlot);
    }
  }

  function getAvailableSlotsForFounder(founder: FounderData): string[] {
    const used = usedSlots[founder.id];
    if (!used) return founder.availableSlots;
    return founder.availableSlots.filter((s) => !used.has(s));
  }

  // Step 1: Score ALL valid pairs
  const allPairs: ScoredPair[] = [];

  for (let i = 0; i < founders.length; i++) {
    for (let j = i + 1; j < founders.length; j++) {
      const a = founders[i];
      const b = founders[j];

      const pairKey = [a.id, b.id].sort().join("|");
      if (existingPairs.has(pairKey)) continue;

      // Skip if either already has 2 confirmed
      if ((confirmedCount[a.id] || 0) >= 2) continue;
      if ((confirmedCount[b.id] || 0) >= 2) continue;

      const aWithAvailable = { ...a, availableSlots: getAvailableSlotsForFounder(a) };
      const bWithAvailable = { ...b, availableSlots: getAvailableSlotsForFounder(b) };

      const { score: complementaryScore, aToBPairs, bToAPairs } = getComplementaryScore(aWithAvailable, bWithAvailable);
      const { score: availabilityScore, overlapping } = getAvailabilityScore(aWithAvailable, bWithAvailable);

      if (overlapping.length === 0) continue;
      if (complementaryScore === 0) continue;

      const phaseScore = getPhaseScore(aWithAvailable, bWithAvailable);
      const industryScore = getIndustryScore(aWithAvailable, bWithAvailable);
      const totalScore = complementaryScore + availabilityScore + phaseScore + industryScore;

      if (totalScore < 25) continue;

      allPairs.push({
        a: aWithAvailable, b: bWithAvailable,
        totalScore, complementaryScore,
        aToBPairs, bToAPairs, overlapping,
        suggestedSlot: overlapping[0],
      });
    }
  }

  // Sort by score descending
  allPairs.sort((x, y) => y.totalScore - x.totalScore);

  // Step 2: Greedy assignment — each founder gets at most 1 new suggestion.
  // Founders who already have a suggestion or confirmed match get a 2nd only if
  // everyone else has been served first.
  const newSuggestionCount: Record<string, number> = {};
  let generated = 0;

  // Target: give 1 suggestion to founders who have 0 active matches
  const selectedPairs: ScoredPair[] = [];

  for (const pair of allPairs) {
    const aTotal = (activeCount[pair.a.id] || 0) + (newSuggestionCount[pair.a.id] || 0);
    const bTotal = (activeCount[pair.b.id] || 0) + (newSuggestionCount[pair.b.id] || 0);

    // Each founder gets at most 1 suggestion from this run
    if ((newSuggestionCount[pair.a.id] || 0) >= 1) continue;
    if ((newSuggestionCount[pair.b.id] || 0) >= 1) continue;

    // Total active (existing + new) capped at 2
    if (aTotal >= 2) continue;
    if (bTotal >= 2) continue;

    selectedPairs.push(pair);
    newSuggestionCount[pair.a.id] = (newSuggestionCount[pair.a.id] || 0) + 1;
    newSuggestionCount[pair.b.id] = (newSuggestionCount[pair.b.id] || 0) + 1;
  }

  // Step 3: Write the selected pairs to the database
  for (const pair of selectedPairs) {
    const reasonForA = generateReason(pair.a, pair.b);
    const reasonForB = generateReason(pair.b, pair.a);
    const matchmakerReason = generateMatchmakerReason(pair.a, pair.b, pair.aToBPairs, pair.bToAPairs, pair.overlapping);

    const [founderAId, founderBId] = [pair.a.id, pair.b.id].sort();
    const [rA, rB] = founderAId === pair.a.id ? [reasonForA, reasonForB] : [reasonForB, reasonForA];

    await prisma.matchSuggestion.create({
      data: {
        founderAId, founderBId,
        score: pair.totalScore,
        suggestedSlot: pair.suggestedSlot,
        reasonForA: rA, reasonForB: rB,
        matchmakerReason,
        status: "suggested",
      },
    });

    generated++;
  }

  return { generated };
}
