import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";
import { broadcastEvent } from "@/app/api/sse/route";

// Function for replacing an asset's category associations wholesale: clears
// out its existing rows in asset_categories and inserts the new set. Runs
// in a transaction so a failed insert can't leave the asset with zero
// categories.
export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const { asset_id, category_ids } = await req.json();

    if (!asset_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // category_ids may legitimately be an empty array (asset tagged with
    // no categories) — guard against null/undefined only.
    const ids: string[] = Array.isArray(category_ids) ? category_ids : [];

    await client.query("BEGIN");

    await client.query(`DELETE FROM asset_categories WHERE asset_id = $1`, [
      asset_id,
    ]);

    if (ids.length > 0) {
      await client.query(
        `
        INSERT INTO asset_categories (asset_id, category_id)
        SELECT $1, unnest($2::uuid[])
        `,
        [asset_id, ids],
      );
    }

    await client.query("COMMIT");

    broadcastEvent({ type: "EDIT_ASSET_CATEGORIES", asset_id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating asset categories in database", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
