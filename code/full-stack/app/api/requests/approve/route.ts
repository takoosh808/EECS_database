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

type ApproveRequestBody = {
  requestId: string;
  finalMessage: string;
  user_id: string;
  checkout_id: string;
};

//POST API route for approving requests
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
    const body = (await req.json()) as ApproveRequestBody;
    const id = body.requestId;
    const finalMessage = body.finalMessage;
    const checkout_id = body.checkout_id;
    const user_id = body.user_id;
    if (!id)
      return NextResponse.json(
        { error: "No checkout ID provided" },
        { status: 400 },
      );
    const reqRow = await pool.query<{ checkout_status: string }>(
      `
            SELECT checkout_status FROM asset_checkout WHERE checkout_id = $1
            `,
      [id],
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
            SET checkout_status = $1, request_date = CURRENT_TIMESTAMP
            WHERE checkout_id = $2
            `,
      ["ACTIVE", id],
    );

    await pool.query(
      `
      INSERT INTO asset_checkout_messages (sender_id, receiver_id, message_text, checkout_id)
      VALUES($1, $2, $3, $4)
      `,
      [adminId, user_id, finalMessage, checkout_id],
    );

    broadcastEvent({ type: "APPROVE", requestId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to approve request" },
      { status: 500 },
    );
  }
}
