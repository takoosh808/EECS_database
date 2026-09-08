"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/my-assets", label: "My Assets" },
  { href: "/my-requests", label: "My Requests" },
  { href: "/settings", label: "Settings" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/upload", label: "Upload" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/users", label: "Users" },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState<"user" | "admin" | "owner" | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole") as "user" | "admin" | "owner" | null;
    setUserRole(role);
  }, []);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      await fetch("/api/users/logout", { method: "POST" });
      localStorage.removeItem("userRole");
    } finally {
      router.push("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex w-full flex-col border-b border-zinc-800 bg-zinc-900 p-4 lg:sticky lg:top-0 lg:h-screen lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-white"><span className="text-crimson-400">EECS</span> Inventory</h2>
      <nav className="flex gap-2 lg:flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-crimson-600 text-white" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {(userRole === "admin" || userRole === "owner") && (
          <>
            <hr className="my-2 border-zinc-700" />
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-crimson-700 text-white" : "text-crimson-300 hover:bg-zinc-800 hover:text-crimson-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-4 rounded-md border border-zinc-700 px-3 py-2 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 lg:mt-auto"
      >
        {loggingOut ? "Logging out..." : "Logout"}
      </button>
    </aside>
  );
}
