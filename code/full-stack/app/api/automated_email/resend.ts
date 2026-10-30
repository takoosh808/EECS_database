import { Resend } from "resend";
import { CheckoutReminder } from "@/app/types";

const fetchOverdue = async (): Promise<CheckoutReminder[]> => {
  try {
    const res = await fetch(
      `${process.env.INTERNAL_API_URL}/api/automated_email/get_users_overdue`,
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const json = await res.json();

    return json;
  } catch (err) {
    console.error("Failed to fetch overdue:", err);
    return [];
  }
};

const updateNotificationHistory = async (
  noto_type: string,
  checkout_id: string,
) => {
  const response = await fetch(
    `${process.env.INTERNAL_API_URL}/api/automated_email/update_notification_history`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ noto_type, checkout_id }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update notification history");
  }

  return await response.json();
};

export async function sendNotifications() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const resend = new Resend(apiKey);
  const overdue: CheckoutReminder[] = await fetchOverdue();
  for (const checkout of overdue) {
    switch (checkout.reminderType) {
      case "OVERDUE":
        resend.emails.send({
          from: "onboarding@resend.dev",
          to: checkout.email,
          subject: "Borrowed Asset Overdue Reminder",
          html: `
            <div>
                <h2>Asset Return Reminder</h2>

                <p>
                Your <strong>${checkout.asset_name}</strong> is overdue please return it ASAP.
                </p>

                <p>
                Return Date: <strong>${checkout.due_date}</strong>
                </p>
            </div>
        `,
        });
        await updateNotificationHistory("OVERDUE", checkout.checkout_id);
        break;

      case "DUE_TOMORROW":
        // Send tomorrow reminder
        resend.emails.send({
          from: "onboarding@resend.dev",
          to: checkout.email,
          subject: "Borrowed Asset Reminder",
          html: `
            <div>
                <h2>Asset Return Reminder</h2>

                <p>
                Your <strong>${checkout.asset_name}</strong> is due tomorrow.
                </p>

                <p>
                Return Date: <strong>${checkout.due_date}</strong>
                </p>

                <p>
                Please make sure to return the item by this date.
                </p>
            </div>
        `,
        });
        await updateNotificationHistory("DUE_TOMORROW", checkout.checkout_id);
        break;

      case "DUE_IN_WEEK":
        // Send week reminder
        resend.emails.send({
          from: "onboarding@resend.dev",
          to: "kaden.metzger@gmail.com",
          subject: "Borrowed Asset Reminder",
          html: `
            <div>
                <h2>Asset Return Reminder</h2>

                <p>
                Your <strong>${checkout.asset_name}</strong> is due in one week.
                </p>

                <p>
                Return Date: <strong>${checkout.due_date}</strong>
                </p>

                <p>
                Please make sure to return the item by this date.
                </p>
            </div>
        `,
        });
        await updateNotificationHistory("DUE_IN_WEEK", checkout.checkout_id);
        break;
    }
  }
}
