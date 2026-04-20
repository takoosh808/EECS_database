import DashboardShell from "../components/DashboardShell";

export default function MyAssetsPage() {
  return (
    <DashboardShell>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">My Assets</h1>
        <p className="mt-2 text-sm text-gray-600">
          This page will show assets currently assigned to you.
        </p>
      </section>
    </DashboardShell>
  );
}
