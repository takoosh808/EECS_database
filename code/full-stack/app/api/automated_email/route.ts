import { NextRequest, NextResponse } from "next/server";
import { sendNotifications } from "@/app/api/automated_email/resend";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sendNotifications();

    return NextResponse.json({
      success: true,
      message: "Notifications processed",
    });
  } catch (error) {
    console.error("Notification job failed:", error);

    return NextResponse.json(
      { error: "Notification job failed" },
      { status: 500 },
    );
  }
}
