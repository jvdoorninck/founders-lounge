import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, lookingFor, offering, companyWebsite, companyPhase, availableSlots } = body;

    if (!name || !phone || !companyWebsite || !companyPhase) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!Array.isArray(lookingFor) || lookingFor.length === 0) {
      return NextResponse.json({ error: "Select at least one thing you're looking for." }, { status: 400 });
    }
    if (!Array.isArray(offering) || offering.length === 0) {
      return NextResponse.json({ error: "Select at least one thing you have to offer." }, { status: 400 });
    }
    if (!Array.isArray(availableSlots) || availableSlots.length === 0) {
      return NextResponse.json({ error: "Select at least one time slot." }, { status: 400 });
    }

    const founder = await prisma.founder.create({
      data: {
        name,
        phone,
        companyWebsite,
        companyPhase,
        lookingFor: JSON.stringify(lookingFor),
        offering: JSON.stringify(offering),
        availableSlots: JSON.stringify(availableSlots),
      },
    });

    // Trigger async enrichment — don't await it
    const baseUrl = req.nextUrl.origin;
    fetch(`${baseUrl}/api/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ founderId: founder.id, website: companyWebsite }),
    }).catch(() => {});

    return NextResponse.json({ success: true, id: founder.id });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
