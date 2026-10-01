import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        403
      </p>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        You don&apos;t have access to this page
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Your account doesn&apos;t have the role required to view this area. If
        you believe this is a mistake, contact the SafeTrust team.
      </p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
