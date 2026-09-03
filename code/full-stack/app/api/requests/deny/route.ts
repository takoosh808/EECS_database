import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";
import { broadcastEvent } from "../../sse/route";

async function getUserRole(
  userId: string | undefined,
): Promise<"user" | "admin" | null> {
  if (!userId) return null;
  try {
    const result = await pool.query<{ role: "user" | "admin" }>(
      "SELECT role FROM users WHERE user_id::text = $1",
      [userId],
    );
    return result.rows[0]?.role ?? null;
  } catch (err) {
    console.error("Error fetching user role:", err);
    return null;
  }
}

type DenyRequestBody = {
  requestId: string;
  finalMessage: string;
  user_id: string;
};

//POST API route for approving requests, very similar to approve but we use DENIED flag
export async function POST(req: NextRequest) {
  try {
    const cookies = req.cookies;
    const adminId = cookies.get("auth_user")?.value;
    const userRole = await getUserRole(adminId);

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }
    const body = (await req.json()) as DenyRequestBody;
    const request_id = body.requestId;
    const user_id = body.user_id;
    const admin_message = body.finalMessage;

    if (!request_id)
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    const reqRow = await pool.query<{ checkout_status: string }>(
      `
            SELECT checkout_status FROM asset_checkout WHERE checkout_id = $1
            `,
      [request_id],
    );
    if (reqRow.rowCount === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 400 });
    }
    if (reqRow.rows[0].checkout_status !== "PENDING") {
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 },
      );
    }

    await pool.query(
      `
            UPDATE asset_checkout
            SET checkout_status = $1
            WHERE checkout_id = $2
            `,
      ["DENIED", request_id],
    );
    await pool.query(
      `
      INSERT INTO asset_checkout_messages (sender_id, receiver_id, message_text)
      VALUES ($1, $2, $3)
      `,
      [adminId, user_id, admin_message],
    );
    broadcastEvent({ type: "DENIED", requestId: request_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to deny request" },
      { status: 500 },
    );
  }
}
