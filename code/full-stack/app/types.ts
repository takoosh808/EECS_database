//file for defining types


//note these are the same things but different names. This may seem redundant but the naming convention is for easier understanding.
//For example assetRequest type is used in place for asset requests.
export type AssetRequest =
{
    id: string;
    asset_id: string;
    user_id: string;
    checkout_status: "PENDING" | "ACTIVE" | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURNED";
    request_date: string;
    checkout_length: number;
    processed_by: string;
    returned_at: string;
}

//ActiveAsset is used for active assets.
export type ActiveAsset =
{
    id: string;
    asset_id: string;
    user_id: string;
    checkout_status: "PENDING" | "ACTIVE" | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURNED";
    request_date: string;
    checkout_length: number;
    processed_by: string;
    returned_at: string;
}

export type InactiveAsset =
{
    id: string;
    asset_id: string;
    user_id: string;
    checkout_status: "PENDING" | "ACTIVE" | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURNED";
    request_date: string;
    checkout_length: number;
    processed_by: string;
    returned_at: string;
}