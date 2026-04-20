"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/my-assets", label: "My Assets" },
  { href: "/my-requests", label: "My Requests" },
  { href: "/settings", label: "Settings" },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      await fetch("/api/users/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex w-full flex-col border-b border-gray-200 bg-white p-4 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Dashboard</h2>
      <nav className="flex gap-2 lg:flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-4 rounded-md border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-auto"
      >
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
    </aside>
  );
}
