import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";
import { Asset } from "../../../../types";
import { broadcastEvent } from "../../../sse/route";

//Function for removing assets from the DB
export async function POST(req: NextRequest) {
  try {
    const asset: Asset = await req.json();
    if (!asset.asset_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    await pool.query(
      `
            DELETE FROM assets WHERE asset_id = $1
            `,
      [asset.asset_id],
    );
    broadcastEvent({ type: "REMOVE_ASSET", asset_id: asset.asset_id });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    const asset: Asset = await req.json();
    console.error(`Error deleting asset ${asset.name}`);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
