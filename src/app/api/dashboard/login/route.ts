import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === process.env.MATCHMAKER_PASSWORD) {
    const res = NextResponse.json({ success: true });
    res.cookies.set("matchmaker_auth", password, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return res;
  }

  return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}
