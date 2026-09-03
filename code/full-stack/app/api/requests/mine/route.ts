import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../db/init/db_index";

function stringToStableInteger(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash || 1;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = req.cookies.get("auth_user")?.value?.trim();
    if (!authUser) {
      return NextResponse.json([]);
    }

    const userIdColumnType = await pool.query<{ data_type: string }>(
      `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'asset_checkout'
        AND column_name = 'user_id'
      LIMIT 1
      `,
    );

    const dataType = userIdColumnType.rows[0]?.data_type ?? "integer";
    let userIdValue: string | number;

    if (
      dataType === "uuid" ||
      dataType === "text" ||
      dataType === "character varying"
    ) {
      userIdValue = authUser;
    } else {
      const numeric = Number.parseInt(authUser, 10);
      userIdValue = Number.isNaN(numeric)
        ? stringToStableInteger(authUser)
        : numeric;
    }

    const result = await pool.query(
      `
      SELECT ac.checkout_id, a.name AS asset, ac.checkout_status, ac.request_date, ac.returned_at
      FROM asset_checkout ac JOIN assets a ON ac.asset_id = a.asset_id
      WHERE ac.user_id = $1
      ORDER BY ac.request_date DESC
      `,
      [userIdValue],
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch user requests" },
      { status: 500 },
    );
  }
}
