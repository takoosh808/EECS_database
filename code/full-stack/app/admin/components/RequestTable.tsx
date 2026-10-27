"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import type { AssetCheckout } from "../../types";

type Props<T extends AssetCheckout> = {
  data: T[];
  title: string;
  description: string;
  emptyMessage: string;
  dateLabel: string;
  formatDate: (value: string) => string;
  actions?: (request: T) => ReactNode;
  showStatusFilter?: boolean;
};

const control =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-600";
const button = `${control} cursor-pointer hover:bg-zinc-50 disabled:cursor-default disabled:opacity-40`;

export default function RequestTable<T extends AssetCheckout>({
  data,
  title,
  description,
  emptyMessage,
  dateLabel,
  formatDate,
  actions,
  showStatusFilter = false,
}: Props<T>) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("original");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const statuses = useMemo(
    () => Array.from(new Set(data.map((row) => row.checkout_status))).sort(),
    [data],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rows = data.filter(
      (row) =>
        (!status || row.checkout_status === status) &&
        (!search ||
          [row.user, row.email, row.asset, row.checkout_id].some((value) =>
            value.toLowerCase().includes(search),
          )),
    );
    if (sort !== "original") {
      rows.sort((a, b) => {
        const difference =
          new Date(a.request_date.replace(" ", "T")).getTime() -
          new Date(b.request_date.replace(" ", "T")).getTime();
        return sort === "oldest" ? difference : -difference;
      });
    }
    return rows;
  }, [data, query, status, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Live updates can remove the last row on a page.
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = filtered.slice(start, start + pageSize);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mx-auto mb-6 max-w-6xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
    >
      <div className="border-b border-zinc-200 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          <span className="rounded-full bg-crimson-50 px-2.5 py-0.5 text-sm font-medium text-crimson-800">
            {data.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
        {data.length > 0 && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label
              className="min-w-0 flex-1 basis-64 text-sm font-medium"
              htmlFor={`${id}-search`}
            >
              Search
              <input
                id={`${id}-search`}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="User, email, asset, or request ID"
                className={`${control} mt-1 block w-full`}
              />
            </label>
            {showStatusFilter && (
              <label className="text-sm font-medium" htmlFor={`${id}-status`}>
                Status
                <select
                  id={`${id}-status`}
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className={`${control} mt-1 block`}
                >
                  <option value="">All statuses</option>
                  {statuses.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm font-medium" htmlFor={`${id}-sort`}>
              Order
              <select
                id={`${id}-sort`}
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                className={`${control} mt-1 block`}
              >
                <option value="original">Default order</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        )}
      </div>
      {visibleRows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          <p>
            {data.length === 0
              ? emptyMessage
              : "No requests match your search or filters."}
          </p>
          {(query || status) && (
            <button
              type="button"
              className={`${button} mt-3`}
              onClick={() => {
                setQuery("");
                setStatus("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                {[
                  "User",
                  "Asset",
                  dateLabel,
                  "Status",
                  ...(actions ? ["Actions"] : []),
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-3 font-medium sm:px-6"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibleRows.map((row) => (
                <tr key={row.checkout_id} className="hover:bg-crimson-50/40">
                  <td className="max-w-64 break-words px-4 py-3 sm:px-6">
                    <div className="font-medium">{row.user}</div>
                    <div className="mt-0.5 text-zinc-500">{row.email}</div>
                  </td>
                  <td className="max-w-64 break-words px-4 py-3 sm:px-6">
                    {row.asset}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                    {formatDate(row.request_date)}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    <span className="inline-block rounded border border-crimson-100 bg-crimson-50 px-2 py-1 text-xs font-medium text-crimson-800">
                      {row.checkout_status.replaceAll("_", " ")}
                    </span>
                  </td>
                  {actions && (
                    <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 text-sm sm:px-6">
          <p role="status" className="text-zinc-500">
            {filtered.length === 0
              ? "0 results"
              : `${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`}
            {filtered.length !== data.length ? ` (${data.length} total)` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`${id}-size`}
              className="flex items-center gap-2 text-zinc-600"
            >
              Rows
              <select
                id={`${id}-size`}
                className={control}
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <nav
              aria-label={`${title} pages`}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                className={button}
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span className="text-zinc-600">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                className={button}
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}
    </section>
  );
}
