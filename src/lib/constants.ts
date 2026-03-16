export const LOOKING_FOR_OPTIONS = [
  "Peer conversation / share experiences",
  "Spar about tech / product",
  "Spar about growth / sales / marketing",
  "Spar about hiring / culture / hr",
  "Spar about fundraising",
  "Advice from someone further in the journey",
  "Find a potential co-founder",
  "Receive candid feedback",
] as const;

export const OFFERING_OPTIONS = [
  "Peer conversation / share experiences",
  "Experienced in tech / product",
  "Experienced in growth / sales / marketing",
  "Experienced in hiring / culture / hr",
  "Experienced in fundraising",
  "Been there, open to give advice",
  "Interested in becoming a co-founder",
  "Honest feedback",
] as const;

export const COMPLEMENTARY_PAIRS: [string, string][] = [
  ["Peer conversation / share experiences", "Peer conversation / share experiences"],
  ["Spar about tech / product", "Experienced in tech / product"],
  ["Spar about growth / sales / marketing", "Experienced in growth / sales / marketing"],
  ["Spar about hiring / culture / hr", "Experienced in hiring / culture / hr"],
  ["Spar about fundraising", "Experienced in fundraising"],
  ["Advice from someone further in the journey", "Been there, open to give advice"],
  ["Find a potential co-founder", "Interested in becoming a co-founder"],
  ["Receive candid feedback", "Honest feedback"],
];

export const PHASE_OPTIONS = [
  "Idea / pre-revenue",
  "Pre-seed (building MVP)",
  "Seed (first customers, finding PMF)",
  "Series A (scaling)",
  "Series B+ (growth)",
  "Bootstrapped / profitable",
  "Exited / post-exit",
] as const;

export const PHASE_ORDER: Record<string, number> = {
  "Idea / pre-revenue": 0,
  "Pre-seed (building MVP)": 1,
  "Seed (first customers, finding PMF)": 2,
  "Series A (scaling)": 3,
  "Series B+ (growth)": 4,
  "Bootstrapped / profitable": 3, // roughly Series A equivalent
  "Exited / post-exit": 5,
};

export const INDUSTRY_TRACK_OPTIONS = [
  "Port & Maritime",
  "Health & Wellbeing",
  "Energy & Climate",
  "AI & Data",
  "Fintech & Legal",
  "Enterprise Software & Infrastructure",
  "Consumer & Lifestyle",
  "Other",
] as const;

export function getEventSlots(): string[] {
  const slots = process.env.EVENT_SLOTS;
  if (!slots) {
    return [
      "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00",
      "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00",
      "Founders Get Together April 10th",
    ];
  }
  return slots.split(",").map((s) => s.trim());
}

// Short labels for match reason generation
export const TOPIC_LABELS: Record<string, string> = {
  "Peer conversation / share experiences": "peer conversations",
  "Spar about tech / product": "tech and product",
  "Spar about growth / sales / marketing": "growth and marketing",
  "Spar about hiring / culture / hr": "hiring and culture",
  "Spar about fundraising": "fundraising",
  "Advice from someone further in the journey": "advice from a more experienced founder",
  "Find a potential co-founder": "a potential co-founder",
  "Receive candid feedback": "candid feedback",
  "Experienced in tech / product": "tech and product",
  "Experienced in growth / sales / marketing": "growth and marketing",
  "Experienced in hiring / culture / hr": "hiring and culture",
  "Experienced in fundraising": "fundraising",
  "Been there, open to give advice": "sharing advice",
  "Interested in becoming a co-founder": "the co-founder route",
  "Honest feedback": "giving candid feedback",
};
