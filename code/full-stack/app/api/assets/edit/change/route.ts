import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";
import { Asset } from "../../../../types";
import { broadcastEvent } from "@/app/api/sse/route";

// Function for updating an existing asset's base fields (name, serial
// number, description, image_url, location). Category associations are
// handled separately by /api/assets/asset_categories/set.
export async function POST(req: NextRequest) {
  try {
    const asset = await req.json();

    if (!asset.asset_id) {
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
        serial_number = $3,
        description = $4,
        image_url = $5,
        location = $6
      WHERE asset_id = $1
      RETURNING *
      `,
      [
        asset.asset_id,
        asset.name,
        asset.serial_number,
        asset.description,
        asset.image_url,
        asset.location,
      ],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    broadcastEvent({ type: "EDIT_ASSET", asset_id: asset.asset_id });

    return NextResponse.json(
      {
        success: true,
        asset: result.rows[0],
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error updating asset in database", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
