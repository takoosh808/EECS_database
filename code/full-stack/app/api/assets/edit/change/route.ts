import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";
import { Asset } from "../../../../types";
import { broadcastEvent } from "@/app/api/sse/route";
import AssetHistoryView from "@/app/admin/components/RequestHistory";

//Function for adding new assets to the DB
export async function POST(req: NextRequest) {
  try {
    const asset: Asset = await req.json();
    if (!asset.id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    const result = await pool.query(
      `
  UPDATE assets
  SET
    name = $2,
    category_id = $3,
    lab_id = $4,
    serial_number = $5,
    description = $6,
    image_url = $7,
    location = $8,
    updated_at = NOW()
  WHERE id = $1
  RETURNING *
  `,
      [
        asset.id,
        asset.name,
        asset.category_id,
        asset.lab_id,
        asset.serial_number,
        asset.description,
        asset.image_url,
        asset.location,
      ],
    );
    broadcastEvent({ type: "ALTER_ASSET", asset_id: asset.id });
    const updatedAsset = result.rows[0];
    return NextResponse.json(
      { success: true, asset: updatedAsset },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error altering asset", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
