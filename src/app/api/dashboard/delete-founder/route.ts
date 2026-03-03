import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { founderId } = await req.json();
  if (!founderId) return NextResponse.json({ error: "Missing founderId" }, { status: 400 });

  await prisma.matchSuggestion.deleteMany({
    where: { OR: [{ founderAId: founderId }, { founderBId: founderId }] },
  });
  await prisma.founder.delete({ where: { id: founderId } });

  return NextResponse.json({ ok: true });
}
