export default function Home() {
  return (
    <main className="min-h-screen bg-bg px-6 py-16">
      <div className="mx-auto max-w-xl rounded-lg border border-border bg-surface2 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Bite Menu</p>
        <h1 className="mt-3 font-display text-4xl text-ink">Scan Your Table QR</h1>
        <p className="mt-4 text-sm text-muted">
          This domain serves table-specific ordering links. Scan the QR code at your table to open
          your restaurant menu.
        </p>
      </div>
    </main>
  )
}
