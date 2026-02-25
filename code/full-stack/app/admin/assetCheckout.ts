import {pool} from "../assetCheckoutDb";

//The following code is for backend asset checkouts

//admins can update the request's state to approved using this function
export async function approveCheckout(assetId: number, userId: number, adminId: number)
{
    const result = await pool.query(
        `
        UPDATE "AssetCheckout"
        SET checkout_status = 'ACTIVE'
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
        UPDATE "Asset_checkout"
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
    if(result.rowCount === 0)
    {
        throw new Error("No REQUESTED checkout found for this asset");
    }
}

//This function is for approving early returns. Users will need to request to return early and have it approved by admins.
//The goal here is to establish easier communication from users to admins. This way the user wont need to send an email and the asset can
//be easily returned in the backend as well
export async function approveReturn(assetId: number, userId: number, adminId: number)
{

}

