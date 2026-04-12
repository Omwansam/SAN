/**
 * Temporary shell for router scaffold (step 1). Replaced by real pages later.
 */
export function PlaceholderLayout({ title, description }) {
  return (
    <main
      className="min-h-screen bg-gray-50 p-8"
      role="main"
      aria-label={title}
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>
    </main>
  )
}
