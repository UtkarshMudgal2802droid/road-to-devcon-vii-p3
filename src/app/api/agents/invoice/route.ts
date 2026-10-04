import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    return NextResponse.json({ answer: `[Invoice Helper] I can help you with your invoice regarding: "${question}". Please provide the invoice number.` });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
