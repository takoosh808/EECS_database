import { send } from "process";
import pool from "../../db/init/db_index";

export async function createMessage(checkoutId: number, adminId: number, userId: number, message: string)
{
    const message_type = 'MESSAGE'
    await pool.query(
        `
        INSERT INTO asses_checkout_messages (checkout_id, sender_id, recipient_id, message_type, message)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [checkoutId, adminId, userId, message_type, message]
    )
}