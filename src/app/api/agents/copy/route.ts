import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    return NextResponse.json({ answer: `[Copy Helper] I will write your brand copy for: "${question}". Let's make it catchy.` });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
