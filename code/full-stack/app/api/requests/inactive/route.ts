import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      `
        SELECT ac.checkout_id, u.name AS user, a.name AS asset, u.email, ac.request_date, ac.checkout_status FROM asset_checkout ac JOIN users u ON
        ac.user_id = u.user_id JOIN assets a
        ON a.asset_id = ac.asset_id
        WHERE checkout_status = 'DENIED' 
        OR checkout_status = 'RETURNED'
        `,
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch inactive assets" },
      { status: 500 },
    );
  }
}
