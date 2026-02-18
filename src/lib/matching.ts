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

function getComplementaryScore(a: FounderData, b: FounderData): { score: number; pairs: [string, string][] } {
  const pairs: [string, string][] = [];

  // Check A's needs vs B's offerings
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (a.lookingFor.includes(need) && b.offering.includes(offer)) {
      pairs.push([need, offer]);
    }
  }
  // Check B's needs vs A's offerings
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (b.lookingFor.includes(need) && a.offering.includes(offer)) {
      if (!pairs.some(([n, o]) => n === need && o === offer)) {
        pairs.push([need, offer]);
      }
    }
  }

  // Both directions checked separately for scoring
  let aToBCount = 0;
  let bToACount = 0;
  for (const [need, offer] of COMPLEMENTARY_PAIRS) {
    if (a.lookingFor.includes(need) && b.offering.includes(offer)) aToBCount++;
    if (b.lookingFor.includes(need) && a.offering.includes(offer)) bToACount++;
  }

  let score = 0;
  const totalMatches = aToBCount + bToACount;
  if (totalMatches === 0) return { score: 0, pairs: [] };

  // Single one-directional match ≈ 10 points, scale up to 40 for many bidirectional
  const bidirectional = Math.min(aToBCount, bToACount) > 0;
  if (bidirectional) {
    score = Math.min(40, 10 + totalMatches * 5);
  } else {
    score = Math.min(25, totalMatches * 10);
  }

  return { score, pairs };
}

function getAvailabilityScore(a: FounderData, b: FounderData): { score: number; overlapping: string[] } {
  const overlapping = a.availableSlots.filter((s) => b.availableSlots.includes(s));
  if (overlapping.length === 0) return { score: 0, overlapping: [] };
  if (overlapping.length === 1) return { score: 15, overlapping };
  if (overlapping.length === 2) return { score: 25, overlapping };
  return { score: 30, overlapping };
}

function getPhaseScore(a: FounderData, b: FounderData): number {
  // Exception: advice seeker + advice giver in later phase
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

  // Simple relatedness check
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

function generateReason(
  recipient: FounderData,
  other: FounderData,
  complementaryPairs: [string, string][]
): string {
  // Find the strongest pair for this recipient
  // Check what the recipient is looking for that the other offers
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

export async function runMatching(): Promise<{ generated: number }> {
  const allFounders = await prisma.founder.findMany();
  const founders = allFounders.map(parseFounder);

  // Get existing match pairs (to avoid duplicates)
  const existingMatches = await prisma.matchSuggestion.findMany({
    select: { founderAId: true, founderBId: true },
  });
  const existingPairs = new Set(
    existingMatches.map((m) => [m.founderAId, m.founderBId].sort().join("|"))
  );

  // Get confirmed matches to track used slots
  const confirmedMatches = await prisma.matchSuggestion.findMany({
    where: { status: "confirmed" },
    select: { founderAId: true, founderBId: true, suggestedSlot: true },
  });

  // Build map of used slots per founder
  const usedSlots: Record<string, Set<string>> = {};
  for (const m of confirmedMatches) {
    if (!usedSlots[m.founderAId]) usedSlots[m.founderAId] = new Set();
    if (!usedSlots[m.founderBId]) usedSlots[m.founderBId] = new Set();
    usedSlots[m.founderAId].add(m.suggestedSlot);
    usedSlots[m.founderBId].add(m.suggestedSlot);
  }

  // Get available slots (original minus confirmed)
  function getAvailableSlots(founder: FounderData): string[] {
    const used = usedSlots[founder.id];
    if (!used) return founder.availableSlots;
    return founder.availableSlots.filter((s) => !used.has(s));
  }

  let generated = 0;

  for (let i = 0; i < founders.length; i++) {
    for (let j = i + 1; j < founders.length; j++) {
      const a = founders[i];
      const b = founders[j];

      // Skip if already matched
      const pairKey = [a.id, b.id].sort().join("|");
      if (existingPairs.has(pairKey)) continue;

      // Use available (non-confirmed) slots
      const aWithAvailable = { ...a, availableSlots: getAvailableSlots(a) };
      const bWithAvailable = { ...b, availableSlots: getAvailableSlots(b) };

      // Calculate scores
      const { score: complementaryScore, pairs } = getComplementaryScore(aWithAvailable, bWithAvailable);
      const { score: availabilityScore, overlapping } = getAvailabilityScore(aWithAvailable, bWithAvailable);

      // No availability overlap = disqualify
      if (overlapping.length === 0) continue;

      // No complementary match = skip
      if (complementaryScore === 0) continue;

      const phaseScore = getPhaseScore(aWithAvailable, bWithAvailable);
      const industryScore = getIndustryScore(aWithAvailable, bWithAvailable);

      const totalScore = complementaryScore + availabilityScore + phaseScore + industryScore;

      // Only suggest if score is meaningful
      if (totalScore < 15) continue;

      // Pick earliest overlapping slot
      const suggestedSlot = overlapping[0];

      // Generate personalized reasons
      const reasonForA = generateReason(aWithAvailable, bWithAvailable, pairs);
      const reasonForB = generateReason(bWithAvailable, aWithAvailable, pairs);

      // Store with founderA having the lower sorted ID for consistency
      const [founderAId, founderBId] = [a.id, b.id].sort();
      const [rA, rB] = founderAId === a.id ? [reasonForA, reasonForB] : [reasonForB, reasonForA];

      await prisma.matchSuggestion.create({
        data: {
          founderAId,
          founderBId,
          score: totalScore,
          suggestedSlot,
          reasonForA: rA,
          reasonForB: rB,
          status: "suggested",
        },
      });

      generated++;
    }
  }

  return { generated };
}
