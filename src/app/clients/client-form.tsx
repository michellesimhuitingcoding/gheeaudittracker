"use client";

import { FieldError, FormMessage } from "@/components/form-message";
import { useFormAction } from "@/components/use-form-action";
import type {
  AuditBy,
  ClientStatus,
  EntityType,
  PaymentStatus,
  Service,
} from "@/generated/prisma/enums";
import {
  AUDIT_BY_LABELS,
  AUDIT_BY_OPTIONS,
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  MONTHS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  SERVICES,
  SERVICE_LABELS,
} from "@/lib/clients/options";
import type { ClientPeopleOptions } from "@/lib/clients/queries";
import type { FormState } from "@/lib/form-state";

export type ClientFormValues = {
  name: string;
  entityType: EntityType;
  regNo: string | null;
  tin: string | null;
  fyeDay: number;
  fyeMonth: number;
  incorporationDate: string | null;
  ownerId: string;
  managerId: string | null;
  partnerId: string | null;
  seniorId: string | null;
  assignedStaffIds: string[];
  services: Service[];
  dormant: boolean;
  status: ClientStatus;
  prepareFormEA: boolean;
  paymentStatus: PaymentStatus;
  auditBy: AuditBy | null;
  signingPartnerIds: string[];
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
};

const inputClass = "rounded border border-zinc-300 px-3 py-2 text-zinc-900 disabled:bg-zinc-100";
const labelClass = "flex flex-col gap-1 text-sm text-zinc-700";
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 font-medium text-zinc-900">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ClientForm({
  action,
  values,
  people,
  ownerLocked,
  canEditPayment,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values?: ClientFormValues;
  people: ClientPeopleOptions;
  ownerLocked: boolean;
  canEditPayment: boolean;
  submitLabel: string;
}) {
  const [state, onSubmit, pending] = useFormAction(action);

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-8">
      <Section title="Identity">
        <label className={labelClass}>
          Client name
          <input name="name" defaultValue={values?.name} required className={inputClass} />
          <FieldError state={state} name="name" />
        </label>
        <label className={labelClass}>
          Entity type
          <select name="entityType" defaultValue={values?.entityType ?? ""} required className={inputClass}>
            <option value="" disabled>
              Choose an entity type
            </option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ENTITY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <FieldError state={state} name="entityType" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Registration no.
            <input name="regNo" defaultValue={values?.regNo ?? ""} className={inputClass} />
            <FieldError state={state} name="regNo" />
          </label>
          <label className={labelClass}>
            TIN
            <input name="tin" defaultValue={values?.tin ?? ""} className={inputClass} />
            <FieldError state={state} name="tin" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <label className={labelClass}>
            FYE day
            <select name="fyeDay" defaultValue={values?.fyeDay ?? ""} required className={inputClass}>
              <option value="" disabled>
                Day
              </option>
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <FieldError state={state} name="fyeDay" />
          </label>
          <label className={labelClass}>
            FYE month
            <select name="fyeMonth" defaultValue={values?.fyeMonth ?? ""} required className={inputClass}>
              <option value="" disabled>
                Month
              </option>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <FieldError state={state} name="fyeMonth" />
          </label>
          <label className={labelClass}>
            Incorporation date
            <input
              name="incorporationDate"
              type="date"
              defaultValue={values?.incorporationDate ?? ""}
              className={inputClass}
            />
            <FieldError state={state} name="incorporationDate" />
          </label>
        </div>
      </Section>

      <Section title="People">
        <label className={labelClass}>
          Sourced by (owner)
          <select
            name="ownerId"
            defaultValue={values?.ownerId ?? ""}
            required
            disabled={ownerLocked}
            className={inputClass}
          >
            <option value="" disabled>
              Choose a Manager or Partner
            </option>
            {people.owners.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          {ownerLocked && values && <input type="hidden" name="ownerId" value={values.ownerId} />}
          {ownerLocked && <span className="text-xs text-zinc-500">Locked after intake. Ask Admin to change it.</span>}
          <FieldError state={state} name="ownerId" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Manager
            <select name="managerId" defaultValue={values?.managerId ?? ""} className={inputClass}>
              <option value="">Not assigned</option>
              {people.managers.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <FieldError state={state} name="managerId" />
          </label>
          <label className={labelClass}>
            Partner
            <select name="partnerId" defaultValue={values?.partnerId ?? ""} className={inputClass}>
              <option value="">Not assigned</option>
              {people.partners.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <FieldError state={state} name="partnerId" />
          </label>
        </div>
        <label className={labelClass}>
          Senior
          <select name="seniorId" defaultValue={values?.seniorId ?? ""} className={inputClass}>
            <option value="">Not assigned</option>
            {people.seniors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <FieldError state={state} name="seniorId" />
        </label>
        <div className="flex flex-col gap-1 text-sm text-zinc-700">
          Assigned staff (Juniors and Seniors on the job or assisting)
          <div className="flex flex-wrap gap-4">
            {people.assignable.map((person) => (
              <label key={person.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="assignedStaffIds"
                  value={person.id}
                  defaultChecked={values?.assignedStaffIds.includes(person.id)}
                />
                {person.name}
              </label>
            ))}
            {people.assignable.length === 0 && <span className="text-zinc-500">No Juniors or Seniors yet.</span>}
          </div>
          <FieldError state={state} name="assignedStaffIds" />
        </div>
      </Section>

      <Section title="Work">
        <div className="flex flex-col gap-1 text-sm text-zinc-700">
          Services
          <div className="flex flex-wrap gap-4">
            {SERVICES.map((service) => (
              <label key={service} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="services"
                  value={service}
                  defaultChecked={values?.services.includes(service)}
                />
                {SERVICE_LABELS[service]}
              </label>
            ))}
          </div>
          <FieldError state={state} name="services" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Status
            <select name="status" defaultValue={values?.status ?? "ACTIVE"} className={inputClass}>
              {CLIENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CLIENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Payment status
            {canEditPayment ? (
              <select name="paymentStatus" defaultValue={values?.paymentStatus ?? "NOT_INVOICED"} className={inputClass}>
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PAYMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="py-2 text-zinc-900">
                {PAYMENT_STATUS_LABELS[values?.paymentStatus ?? "NOT_INVOICED"]}
                <span className="block text-xs text-zinc-500">Set by Admin.</span>
              </span>
            )}
            <FieldError state={state} name="paymentStatus" />
          </label>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-zinc-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="dormant" defaultChecked={values?.dormant} />
            Dormant
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="prepareFormEA" defaultChecked={values?.prepareFormEA} />
            Prepare Form EA
          </label>
        </div>
      </Section>

      <Section title="Audit">
        <label className={labelClass}>
          Audit by
          <select name="auditBy" defaultValue={values?.auditBy ?? ""} className={inputClass}>
            <option value="">Not applicable</option>
            {AUDIT_BY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {AUDIT_BY_LABELS[option]}
              </option>
            ))}
          </select>
          <FieldError state={state} name="auditBy" />
        </label>
        <div className="flex flex-col gap-1 text-sm text-zinc-700">
          Signing partners
          <div className="flex flex-wrap gap-4">
            {people.signingPartners.map((person) => (
              <label key={person.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="signingPartnerIds"
                  value={person.id}
                  defaultChecked={values?.signingPartnerIds.includes(person.id)}
                />
                {person.name}
              </label>
            ))}
            {people.signingPartners.length === 0 && <span className="text-zinc-500">No Partners yet.</span>}
          </div>
          <FieldError state={state} name="signingPartnerIds" />
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-2 gap-4">
          <label className={labelClass}>
            Contact name
            <input name="contactName" defaultValue={values?.contactName ?? ""} className={inputClass} />
          </label>
          <label className={labelClass}>
            Contact phone
            <input name="contactPhone" defaultValue={values?.contactPhone ?? ""} className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Contact email
          <input name="contactEmail" type="email" defaultValue={values?.contactEmail ?? ""} className={inputClass} />
          <FieldError state={state} name="contactEmail" />
        </label>
        <label className={labelClass}>
          Address
          <textarea name="address" defaultValue={values?.address ?? ""} rows={3} className={inputClass} />
        </label>
      </Section>

      <FormMessage state={state} />
      {state && !state.ok && state.fieldErrors && (
        <p role="alert" className="text-sm text-red-600">
          Please fix the highlighted fields.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
