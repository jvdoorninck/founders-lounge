import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = cookieStore.get("matchmaker_auth");
  if (auth?.value !== process.env.MATCHMAKER_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { founderId, industry } = await req.json();

  if (!founderId || !industry) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await prisma.founder.update({
    where: { id: founderId },
    data: { industry, industryEnriched: true },
  });

  return NextResponse.json({ success: true });
}
