import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

export async function GET(req: NextRequest) {
  try {
    const deleted = req.nextUrl.searchParams.get("deleted") === "true";
    if (deleted) {
      const userId = req.cookies.get("auth_user")?.value;
      if (!userId) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      const user = await pool.query<{ role: string }>("SELECT role FROM users WHERE user_id::text = $1", [userId]);
      if (user.rows[0]?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const result = await pool.query(
      `
        SELECT asset_id, name, serial_number, description, image_url, location, created_at, updated_at, is_deleted,
          EXISTS (SELECT 1 FROM asset_checkout ac WHERE ac.asset_id = assets.asset_id
            AND ac.checkout_status IN ('ACTIVE', 'RETURN_REQUESTED', 'RETURN_APPROVED')) AS is_checked_out,
          EXISTS (SELECT 1 FROM asset_checkout ac WHERE ac.asset_id = assets.asset_id
            AND ac.checkout_status = 'PENDING') AS has_pending_requests
        FROM assets
        WHERE is_deleted = $1
        `,
      [deleted],
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}
