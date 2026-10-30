import { NextRequest, NextResponse } from "next/server";
import pool from "@/db/init/db_index";
import { CheckoutReminder } from "@/app/types";
export async function GET(req: NextRequest) {
  try {
    const result = await pool.query<CheckoutReminder>(
      `
        SELECT
        ac.checkout_id,
        u.name,
        u.email,
        a.name AS asset_name,
        ac.due_date,
        nh.overdue,
        nh.due_tomorrow,
        nh.due_in_week,
        CASE
            WHEN ac.due_date::date < CURRENT_DATE THEN 'OVERDUE'
            WHEN ac.due_date::date = CURRENT_DATE + 1 THEN 'DUE_TOMORROW'
            WHEN ac.due_date::date = CURRENT_DATE + 7 THEN 'DUE_IN_WEEK'
            ELSE NULL
        END AS "reminderType"
    FROM asset_checkout ac
    JOIN users u ON ac.user_id = u.user_id
    JOIN assets a ON a.asset_id = ac.asset_id
    JOIN notification_history nh ON ac.checkout_id = nh.checkout_id
    WHERE ac.checkout_status = 'ACTIVE';
        `,
    );
    const reminders = result.rows.filter(
      (checkoutReminder) => checkoutReminder.reminderType != null,
    );

    return NextResponse.json(reminders);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch assets due soon" },
      { status: 500 },
    );
  }
}
