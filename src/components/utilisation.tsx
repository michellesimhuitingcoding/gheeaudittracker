import type { Utilisation } from "@/lib/timecost/service";

export function UtilisationCell({ utilisation }: { utilisation: Utilisation }) {
  return (
    <div className="flex flex-col gap-1">
      <span>{utilisation.percent === null ? "—" : `${utilisation.percent}%`}</span>
      <span className="text-xs text-zinc-600">
        {utilisation.billableHours} of {utilisation.availableHours} h
      </span>
    </div>
  );
}
