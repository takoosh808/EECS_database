import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";

export async function GET(req: NextRequest) {
  const cookies = req.cookies;
  const userId = cookies.get("auth_user")?.value;
  console.log("test");
  console.log(userId);
  try {
    const result = await pool.query(
      `
       SELECT ac.checkout_id, a.name AS asset, ac.checkout_length, ac.request_date, ac.due_date
        FROM asset_checkout ac JOIN assets a ON ac.asset_id = a.asset_id
        WHERE ac.checkout_status = 'ACTIVE' AND ac.user_id = $1
        `,
      [userId],
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
