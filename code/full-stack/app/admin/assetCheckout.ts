import {pool} from "../assetCheckoutDb";

export async function approveCheckout(assetId: number, userId: number, adminId: number)
{
    const result = await pool.query(
        `
        UPDATE "AssetCheckout"
        SET checkout_status = 'APPROVED'
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

export async function denyCheckout(assetId: number, userId: number, adminId: number)
{
    const reuslt = await pool.query(
        `
        UPDATE "AssetCheckout"
        SET checkout_status = 'DENIED'
            approved_by = $3,
            approved_at = NOW()
        WHERE asset_id = $1
            AND checkout_status = 'PENDING'
            AND user_id = $2
        `
        ,
        [assetId, userId, adminId]
    );
    if(Result.rowCount === 0)
    {
        throw new Error("No REQUESTED checkout found for this asset");
    }
}