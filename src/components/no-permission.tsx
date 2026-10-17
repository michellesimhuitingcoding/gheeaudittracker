import Link from "next/link";

export function NoPermission() {
  return (
    <div className="flex flex-col gap-2">
      <p role="alert" className="text-zinc-900">
        You do not have permission to view this page.
      </p>
      <Link href="/" className="text-sm text-zinc-600 underline">
        Back to home
      </Link>
    </div>
  );
}
