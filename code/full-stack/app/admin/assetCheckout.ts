import pool from "../../db/init/db_index";

//The following code is for backend asset checkouts

//admins can update the request's state to approved using this function
export async function approveCheckout(assetId: number, userId: number, adminId: number)
{
    const result = await pool.query(
        `
        UPDATE "asset_checkout"
        SET checkout_status = 'ACTIVE',
            approved_by = $3,
            approved_at = NOW()
        WHERE asset_id = $1
            AND checkout_status = 'PENDING'
            AND user_id = $2
        `
        ,
        [assetId, userId, adminId]
    );

    if (result.rowCount === 0)
    {
        throw new Error("No REQUESTED checkout found for this asset");
    }
}

//Admins can also deny checkouts using this function
export async function denyCheckout(assetId: number, userId: number, adminId: number)
{
    const result = await pool.query(
        `
        UPDATE "asset_checkout"
        SET checkout_status = 'DENIED',
            approved_by = $3,
            approved_at = NOW()
        WHERE asset_id = $1
            AND checkout_status = 'PENDING'
            AND user_id = $2
        `
        ,
        [assetId, userId, adminId]
    );
    if(result.rowCount === 0)
    {
        throw new Error("No REQUESTED checkout found for this asset");
    }
}

//This function is for approving early returns. Users will need to request to return early and have it approved by admins.
//The goal here is to establish easier communication from users to admins. This way the user wont need to send an email and the asset can
//be easily returned in the backend as well
export async function approveReturnRequest(assetId: number, userId: number)
{
    const result = await pool.query(
        `
        UPDATE "asset_checkout"
        SET checkout_status = 'RETURN_APPROVED'
        WHERE asset_id = $1
            AND checkout_status = 'RETURN_REQUESTED'
            AND user_id = $2
        `
        ,
        [assetId, userId]
    );
    if(result.rowCount === 0)
    {
        throw new Error("No RETURN_REQUEST found for this asset");
    }
}

export async function markItemReturned(assetId: number, userId: number)
{
    const result = await pool.query(
        `
        UPDATE "asset_checkout"
        SET checkout_status = 'RETURNED'
        WHERE asset_id = $1
            AND checkout_status = 'RETURN_APPROVED'
            AND user_id = $2
        `
        ,
        [assetId, userId]
    );
    if(result.rowCount === 0)
    {
        throw new Error("No RETURN_ARPPOVED asset was found");
    }
}
