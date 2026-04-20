import DashboardShell from "../components/DashboardShell";

export default function SettingsPage() {
  return (
    <DashboardShell>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          This page will hold your profile and preference settings.
        </p>
      </section>
    </DashboardShell>
  );
}
