import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";

type DashboardShellProps = {
  children: ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <AppSidebar />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
