import { NextResponse } from "next/server";

export const runtime = "nodejs";
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "User self-registration is disabled.",
    },
    { status: 410 }
  );
}
