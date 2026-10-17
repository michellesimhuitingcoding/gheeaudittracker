"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "@/lib/form-state";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

// Like useActionState, but submits via onSubmit so React does not clear the
// form afterwards — what the user typed stays put when validation fails.
export function useFormAction(action: Action) {
  const [state, dispatch, pending] = useActionState(action, null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return [state, onSubmit, pending] as const;
}
