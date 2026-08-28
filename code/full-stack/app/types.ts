//file for defining types
export type AssetCheckout = {
  checkout_id: string;
  asset: string;
  user: string;
  checkout_status:
    | "PENDING"
    | "ACTIVE"
    | "RETURN_REQUESTED"
    | "RETURN_APPROVED"
    | "RETURNED";
  request_date: string;
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
  asset_id: string;
  name: string;
  description: string;
  image_url: string;
  location: string;
  serial_number: string;
  created_at?: string;
  updated_at?: string;
};

export type AssetCategory = {
  asset_id: Asset;
  categories: string[];
};

export type Lab = {
  id: string;
  name: string;
  created_at?: string;
};

export type Category = {
  category_id: string;
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
