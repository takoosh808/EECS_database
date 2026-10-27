"use client";
import type { AssetCheckout } from "../../types";
import RequestTable from "./RequestTable";

type Props = { data: AssetCheckout[]; };

export default function AssetHistoryView({ data }: Props) {
  return (
    <RequestTable
      data={data}
      showStatusFilter
      title="Request History"
      description="Find past requests without scrolling through the full archive."
      emptyMessage="No inactive requests."
      dateLabel="Requested"
      formatDate={value => new Date(value.replace(" ", "T")).toLocaleDateString()}
    />
  );
}
