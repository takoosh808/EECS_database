import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const asset_id = searchParams.get("asset_id");
    const result = await pool.query(
      `
        SELECT ac.category_id, c.name FROM asset_categories ac JOIN categories c ON ac.category_id = c.category_id WHERE
        asset_id = $1
        `,
      [asset_id],
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}
