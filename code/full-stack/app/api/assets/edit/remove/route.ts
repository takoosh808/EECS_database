import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";
import { Asset } from "../../../../types";
import { broadcastEvent } from "../../../sse/route";

//Function for removing assets from the DB
export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("auth_user")?.value;
    if (!userId) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const user = await pool.query<{ role: string }>("SELECT role FROM users WHERE user_id::text = $1", [userId]);
    if (user.rows[0]?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const asset: Asset & { restore?: boolean } = await req.json();
    if (!asset.asset_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    const result = await pool.query(
      `
            UPDATE assets SET is_deleted = $2 WHERE asset_id = $1 RETURNING asset_id
            `,
      [asset.asset_id, asset.restore !== true],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    broadcastEvent({ type: asset.restore === true ? "ADD_ASSET" : "REMOVE_ASSET", asset_id: asset.asset_id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if ((err as { code?: string }).code === "23514") {
      if ((err as { constraint?: string }).constraint === "asset_pending_requests") {
        return NextResponse.json({ error: "This asset has pending requests. Clear them before removing the asset." }, { status: 409 });
      }
      return NextResponse.json({ error: "Cannot remove an asset while it is checked out. Mark it returned first." }, { status: 409 });
    }
    console.error("Error updating asset deletion status", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
