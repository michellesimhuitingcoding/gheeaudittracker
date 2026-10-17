// WORKFLOW.md §10 timecost: hours × hourly rate, compared with the job budget.

export type JobTimecost = {
  hours: number;
  cost: number;
  // Hours logged by staff with no hourly rate set, so missing from `cost`.
  unratedHours: number;
  budgetHours: number | null;
  budgetCost: number | null;
  // Actual minus budget: positive is over budget.
  hoursVariance: number | null;
  costVariance: number | null;
};

const cents = (value: number) => Math.round(value * 100);

export function jobTimecost(
  entries: readonly { hours: number; rate: number | null }[],
  budget: { hours: number | null; cost: number | null },
): JobTimecost {
  let hours = 0;
  let cost = 0;
  let unrated = 0;
  for (const entry of entries) {
    hours += cents(entry.hours);
    if (entry.rate === null) unrated += cents(entry.hours);
    else cost += Math.round(entry.hours * entry.rate * 100);
  }
  return {
    hours: hours / 100,
    cost: cost / 100,
    unratedHours: unrated / 100,
    budgetHours: budget.hours,
    budgetCost: budget.cost,
    hoursVariance: budget.hours === null ? null : (hours - cents(budget.hours)) / 100,
    costVariance: budget.cost === null ? null : (cost - cents(budget.cost)) / 100,
  };
}

const ringgit = new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" });

export function formatRinggit(value: number): string {
  return ringgit.format(value);
}
