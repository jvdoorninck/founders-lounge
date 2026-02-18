import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const { founderId, website } = await req.json();

    if (!founderId || !website) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // No API key — mark as unknown
      await prisma.founder.update({
        where: { id: founderId },
        data: { industry: "unknown", industryEnriched: false },
      });
      return NextResponse.json({ industry: "unknown" });
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that determines a company's industry from its website URL/domain. Respond with ONLY a short industry label (1-3 words), e.g. 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'EdTech', 'Climate Tech', 'AI/ML', 'Marketplace', 'Developer Tools', 'Consumer App', 'B2B Software', 'Logistics', 'Food & Beverage', etc. If you cannot determine the industry, respond with 'unknown'.",
        },
        {
          role: "user",
          content: `What industry is this company in? Website: ${website}`,
        },
      ],
      max_tokens: 20,
      temperature: 0,
    });

    const industry = response.choices[0]?.message?.content?.trim() || "unknown";

    await prisma.founder.update({
      where: { id: founderId },
      data: {
        industry,
        industryEnriched: industry !== "unknown",
      },
    });

    return NextResponse.json({ industry });
  } catch (err) {
    console.error("Enrichment error:", err);
    // On failure, mark as unknown
    try {
      const { founderId } = await req.clone().json();
      if (founderId) {
        await prisma.founder.update({
          where: { id: founderId },
          data: { industry: "unknown", industryEnriched: false },
        });
      }
    } catch {}
    return NextResponse.json({ industry: "unknown" });
  }
}
