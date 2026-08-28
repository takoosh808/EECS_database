import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../../db/init/db_index";

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const body = await req.json();

    const {
      asset_id,
      name,
      description,
      image_url,
      location,
      serial_number,
      category_ids,
    } = body;

    // -------------------------
    // 1. Validate input
    // -------------------------

    if (!asset_id || typeof asset_id !== "string") {
      return NextResponse.json({ error: "Invalid asset_id" }, { status: 400 });
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!serial_number || typeof serial_number !== "string") {
      return NextResponse.json(
        { error: "Serial number is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(category_ids)) {
      return NextResponse.json(
        { error: "asset must have a category" },
        { status: 400 },
      );
    }

    // -------------------------
    // 2. Start transaction
    // -------------------------

    await client.query("BEGIN");

    // -------------------------
    // 3. Insert asset
    // -------------------------

    const result = await client.query(
      `
      UPDATE assets SET name = $2, description = $3, image_url = $4, location = $5, serial_number = $6 WHERE asset_id = $1
      RETURNING *
      `,
      [
        asset_id,
        name,
        description ?? null,
        image_url ?? null,
        location ?? null,
        serial_number,
      ],
    );

    await client.query(
      `
      DELETE FROM asset_categories
      WHERE asset_id = $1
      `,
      [asset_id],
    );

    for (const category_id of category_ids) {
      await client.query(
        `
        INSERT INTO asset_categories (
          asset_id,
          category_id
        )
        VALUES ($1, $2)
        `,
        [asset_id, category_id],
      );
    }

    // -------------------------
    // 5. Commit transaction
    // -------------------------

    await client.query("COMMIT");

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    // Undo everything if anything failed
    await client.query("ROLLBACK");

    console.error("Error creating asset:", error);

    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
