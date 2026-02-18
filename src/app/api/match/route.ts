import { NextRequest, NextResponse } from "next/server";
import { runMatching } from "@/lib/matching";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  // Verify matchmaker auth
  const cookieStore = await cookies();
  const auth = cookieStore.get("matchmaker_auth");
  if (auth?.value !== process.env.MATCHMAKER_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMatching();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Matching error:", err);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}
