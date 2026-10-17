import type { FormState } from "@/lib/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.ok) {
    return (
      <p role="status" className="text-sm text-green-700">
        {state.message}
      </p>
    );
  }
  if (!state.error) return null;
  return (
    <p role="alert" className="text-sm text-red-600">
      {state.error}
    </p>
  );
}

export function FieldError({ state, name }: { state: FormState; name: string }) {
  const messages = state && !state.ok ? state.fieldErrors?.[name] : undefined;
  if (!messages?.length) return null;
  return <p className="text-sm text-red-600">{messages[0]}</p>;
}
