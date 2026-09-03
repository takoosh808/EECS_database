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

export async function POST(req: NextRequest) {
  try {
    const cookies = req.cookies;
    const userId = cookies.get("auth_user")?.value;
    const userRole = await getUserRole(userId);

    if (userRole !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const body = (await req.json()) as { checkout_id?: string };
    const checkout_id = body.checkout_id;

    if (!checkout_id)
      return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    const reqRow = await pool.query<{ checkout_status: string }>(
      `
            SELECT checkout_status FROM asset_checkout WHERE checkout_id = $1
            `,
      [checkout_id],
    );
    if (reqRow.rowCount === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 400 });
    }
    if (reqRow.rows[0].checkout_status === "RETURNED") {
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 },
      );
    }

    await pool.query(
      `
            UPDATE asset_checkout 
            SET checkout_status = $1, returned_at = CURRENT_TIMESTAMP
            WHERE checkout_id = $2
            `,
      ["RETURNED", checkout_id],
    );
    broadcastEvent({ type: "RETURNED", requestId: checkout_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to approve return" },
      { status: 500 },
    );
  }
}
