import { NextRequest, NextResponse } from "next/server";
import pool from "@/db/init/db_index";
export async function POST(request: NextRequest) {
  const { noto_type, checkout_id } = await request.json();
  if (noto_type == "OVERDUE") {
    try {
      const result = await pool.query(
        `
                UPDATE notification_history
                SET overdue = TRUE
                WHERE checkout_id = $1
                RETURNING *
            `,
        [checkout_id],
      );
      console.log("Checkout ID:", checkout_id);
      console.log("Updated rows:", result.rowCount);
      console.log("Updated record:", result.rows[0]);
    } catch (error) {
      console.error("Failed to update notification history:", error);
    }
  }
  if (noto_type == "DUE_IN_WEEK") {
    try {
      const result = await pool.query(
        `
                UPDATE notification_history
                SET due_in_week = TRUE
                WHERE checkout_id = $1
                RETURNING *
            `,
        [checkout_id],
      );
      console.log("Checkout ID:", checkout_id);
      console.log("Updated rows:", result.rowCount);
      console.log("Updated record:", result.rows[0]);
    } catch (error) {
      console.error("Failed to update notification history:", error);
    }
  }
  if (noto_type == "DUE_TOMORROW") {
    try {
      const result = await pool.query(
        `
                UPDATE notification_history
                SET due_tomorrow = TRUE
                WHERE checkout_id = $1
                RETURNING *
            `,
        [checkout_id],
      );
      console.log("Checkout ID:", checkout_id);
      console.log("Updated rows:", result.rowCount);
      console.log("Updated record:", result.rows[0]);
    } catch (error) {
      console.error("Failed to update notification history:", error);
    }
  }

  return NextResponse.json({ success: true });
}
