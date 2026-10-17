export type FormState =
  | { ok: true; message: string }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<string, string[]>> }
  | null;
