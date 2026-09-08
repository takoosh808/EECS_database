import { NextRequest, NextResponse } from "next/server";
import pool from "../../../db/init/db_index";
import { broadcastEvent } from "../sse/route";

//GET API for querying Requested assets
export async function GET(req: NextRequest) {
  const result = await pool.query(
    `
        SELECT ac.checkout_id, a.name AS asset, u.name AS user, ac.checkout_status, ac.request_date, ac.request_reason, u.user_id, u.email
FROM asset_checkout ac JOIN users u ON ac.user_id = u.user_id 
JOIN assets a ON a.asset_id = ac.asset_id WHERE ac.checkout_status = 'PENDING'
        `,
  );
  return NextResponse.json(result.rows);
}

type CreateRequestBody = {
  assetId?: string;
  requestReason?: string;
  checkoutLength: string;
  dueDate: string;
};

function stringToStableInteger(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash || 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateRequestBody;
    const checkout_length = body.checkoutLength;
    const due_date = body.dueDate;
    const assetId = body.assetId?.trim();
    const request_reason = body.requestReason;
    if (!assetId) {
      return NextResponse.json(
        { error: "assetId is required" },
        { status: 400 },
      );
    }

    const authUser =
      req.cookies.get("auth_user")?.value?.trim() ?? "anonymous_user";
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

    const inserted = await pool.query<{ user_id: string }>(
      `
            INSERT INTO asset_checkout (asset_id, user_id, checkout_status, request_reason, checkout_length, due_date)
            VALUES ($1, $2, 'PENDING', $3, $4, $5)
            `,
      [assetId, userIdValue, request_reason, checkout_length, due_date],
    );

    const requestId = inserted.rows[0]?.user_id;

    broadcastEvent({ type: "REQUEST_CREATED", requestId });
    return NextResponse.json({ success: true, request_id: requestId });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 },
    );
  }
}
