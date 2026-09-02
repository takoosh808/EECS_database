import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      `
        SELECT ac.checkout_id, a.name AS asset, u.name AS user, ac.checkout_status, ac.request_date
FROM asset_checkout ac JOIN users u ON ac.user_id = u.user_id 
JOIN assets a ON a.asset_id = ac.asset_id WHERE ac.checkout_status = 'ACTIVE'
        `,
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch active assets" },
      { status: 500 },
    );
  }
}
