export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">Inventory Tool</h1>
        <p className="text-sm">Use one of the entry points below.</p>
        <a className="w-fit text-sm underline" href="/upload">
          Go to CSV upload
        </a>
        <a className="w-fit text-sm underline" href="/login">
          Go to login page
        </a>
      </main>
    </div>
  );
}
