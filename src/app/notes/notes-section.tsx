import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { addInternalNoteAction } from "./actions";
import { NoteForm } from "./note-form";

// Internal notes for a client, or for one of its jobs. Callers check that the
// viewer can see the client first.
export async function NotesSection({ clientId, jobId }: { clientId: string; jobId?: string }) {
  const notes = await db.internalNote.findMany({
    where: jobId ? { jobId } : { clientId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { author: { select: { name: true } }, job: { select: { year: true } } },
  });

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <h2 className="font-medium text-zinc-900">Internal notes</h2>
      <p className="text-sm text-zinc-600">For staff only. Notes cannot be edited or deleted.</p>
      <NoteForm action={addInternalNoteAction.bind(null, clientId, jobId ?? null)} />
      {notes.length === 0 && <p className="text-sm text-zinc-600">No notes yet.</p>}
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded border border-zinc-200 bg-white p-3 text-sm">
            <p className="text-xs text-zinc-500">
              {note.author.name} · {formatDateTime(note.createdAt)}
              {!jobId && note.job && ` · FY ${note.job.year} audit`}
            </p>
            <p className="whitespace-pre-wrap pt-1 text-zinc-900">{note.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
