import Link from "next/link";

export default function UserHomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
        <h1 className="text-3xl font-semibold">Homepage</h1>
        <Link href="/login" className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-white">
          Back to login
        </Link>
      </main>
    </div>
  );
}
