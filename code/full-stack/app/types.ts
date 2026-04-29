//file for defining types
export type AssetCheckout = {
  id: string;
  asset_id: string;
  user_id: string;
  checkout_status:
    | "PENDING"
    | "ACTIVE"
    | "RETURN_REQUESTED"
    | "RETURN_APPROVED"
    | "RETURNED";
  request_date: string;
  checkout_length: number;
  processed_by: string;
  returned_at: string;
};

export type asset_update = {
  checkout_status:
    | "PENDING"
    | "ACTIVE"
    | "RETURN_REQUESTED"
    | "RETURN_APPROVED"
    | "RETURNED";
};

export type Asset = {
  id: string;
  name: string;
  category_id: string;
  lab_id: string;
  description: string;
  image_url: string;
  location: string;
  serial_number: string;
  created_at?: string;
  updated_at?: string;
};

export type Lab = {
  id: string;
  name: string;
  created_at?: string;
};

export type Category = {
  id: string;
  name: string;
  created_at?: string;
};

export type AssetRow = {
  id: string;
  name: string;
  location: string;
  rentedOut: boolean;
  rentedTo: string | null;
  rentedOutAt: string | null;
  description: string;
};
