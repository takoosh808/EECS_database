//file for defining types
export type Asset =
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

export type asset_update =
{
    checkout_status: "PENDING" | "ACTIVE" | "RETURN_REQUESTED" | "RETURN_APPROVED" | "RETURNED";
}
