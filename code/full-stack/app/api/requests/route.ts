import { NextRequest, NextResponse } from "next/server";
import pool from "../../../db/init/db_index";
import { broadcastEvent } from "../sse/route";

//GET API for querying Requested assets
export async function GET(req: NextRequest) {
  const result = await pool.query(
    `
        SELECT checkout_id, asset_id, user_id, checkout_status, request_date, checkout_length, processed_by, returned_at
        FROM asset_checkout
        WHERE checkout_status = 'PENDING'
        `,
  );
  return NextResponse.json(result.rows);
}

type CreateRequestBody = {
  assetId?: string;
  requesterName?: string;
  lab?: string;
  reason?: string;
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
    const assetId = body.assetId?.trim();
    const requesterName = body.requesterName?.trim() ?? "";
    const requestLab = body.lab?.trim() ?? "";
    const requestReason = body.reason?.trim() ?? "";

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

    const inserted = await pool.query<{ id: string }>(
      `
            INSERT INTO asset_checkout (asset_id, user_id, checkout_status)
            VALUES ($1, $2, 'PENDING')
            `,
      [assetId, userIdValue],
    );

    const requestId = inserted.rows[0]?.id;
    const requestDetails = [
      requesterName ? `Name: ${requesterName}` : "",
      requestLab ? `Lab: ${requestLab}` : "",
      requestReason ? `Reason: ${requestReason}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    if (requestId && requestDetails) {
      await pool.query(
        `
                INSERT INTO asset_checkout_messages (checkout_id, message_type, message_text)
                VALUES ($1, 'REASON', $2)
                `,
        [requestId, requestDetails],
      );
    }

    broadcastEvent({ type: "REQUEST_CREATED", requestId });
    return NextResponse.json({ success: true, id: requestId });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 },
    );
  }
}
