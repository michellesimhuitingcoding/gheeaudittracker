# WORKFLOW.md — Engagement Tracker Specification

## 1. Firm Structure
- Malaysian accounting firm, ~50 staff, Kuching, Sarawak
- Services: Audit, Tax, Bookkeeping, Secretarial tracking
- 10 login roles + 2 external (no login)
- 1,000+ portfolios (scale target)
- SME clients only (no listed companies)

**Login roles:**
Junior, Senior, Manager, Partner, Admin, Audit Admin Assistant, Audit Admin Manager, Secretarial, Secretarial Assistant, Master Admin

**External (no login):**
Bookkeeper (homestaff/outsourced), Outsider referrer

## 2. Entity Types & Workflows

**Sdn Bhd** (full audit):
Documents received → Pre-audit → Ready → In Progress → Manager Review → Partner Review → Clear Review → Final Review → Finalisation → XBRL → MBRS → Form C → MITRS → Archive

**PLT** (no audit):
Documents received → Accounts prep → SSM annual declaration → Form C → MITRS → Archive

**Enterprise** (no audit, no MBRS):
Documents received → Report prep → Tax schedule → Form B → Print → Done

**Partnership** (no audit, no MBRS):
Documents received → Report prep → Tax schedule → Form P → Print → Done

**Individual (Personal Tax):**
Docs → Compute → Relief receipts → Form BE/B → e-Filing submit → Done

**All companies** also have:
Form E job (employer return): Receive payroll → Prepare Form E → Manager review → Submit LHDN → Bill → Done

## 3. Audit Track (Sdn Bhd only) — 9 stages
1. Documents received (Audit Admin updates)
2. Pre-audit (staff; Partner confirms deadline)
3. Ready
4. In Progress
5. Manager Review (review note required)
6. Partner Review (review note required; can raise queries)
7. Clear Review
8. Final Review
9. Finalisation
→ XBRL generated (flag) → passed to secretarial

## 4. Roles & Permissions

| Role | Sees | Can Do | Cannot Do |
|------|------|--------|-----------|
| Junior | Own files, master list | Stages 1-4,7; log time; check-in | Assign, bill, commission |
| Senior | Own jobs only | Allocate to Juniors; stages 1-4,7 | Other seniors' jobs |
| Manager | Own clients, team | Assign staff; stages 5,8,9; bill; tick Billed; review Manager-owned bookkeeping | Others' clients |
| Partner | All + "My Clients" toggle | Sign-off stage 6; raise queries; bill; own commission | Others' commission |
| Admin | Invoices, payments | Set owner; invoice; payment; reminders; document received; edit hourly rates, salaries, OT pay | Assign; move audit stages; edit timecost |
| Audit Admin Assistant | Master list, allocations | Document received; print; sign coordination; intake | Bill; payments; assign; timesheet |
| Audit Admin Manager | Same + timesheet | + review Partner-owned bookkeeping; edit hourly rates | Bill; payments; edit fees |
| Secretarial (5) | All clients (MBRS) | Acknowledge; mark MBRS | Audit; tax; billing |
| Master Admin | Everything | Assign roles; settings; backup | Business work |
| Bookkeeper (ext) | — | — | — |
| Outsider referrer (ext) | — | — | — |

**Stage permissions (audit only):**
- Junior, Senior: stages 1-4, 7
- Manager: stages 5, 8, 9
- Partner: stage 6
- Others: blocked (greyed out with reason)

**Salary visibility:**
- Junior/Senior: own only
- Manager: own + all Juniors/Seniors firm-wide
- Partner/Admin/Master Admin: all
- Audit Admin Manager/Assistant, Secretarial: none

**Hourly rate visibility:**
- Editable: Admin, Master Admin, Audit Admin Manager
- Manager/Partner: view only
- Junior/Senior/Secretarial: none

**Settings edit:**
- Master Admin: all
- Admin: hourly rates, salaries, OT pay fields
- Audit Admin Manager: hourly rates only
- Others: view only

## 5. Client Fields
- name, entityType, regNo, TIN, FYE, incorporationDate
- ownerId (sourced by — Manager/Partner, locked at intake)
- managerId, partnerId, seniorId, assignedStaff[]
- services[], dormant, status
- contactName/Phone/Email, address
- prepareFormEA: true/false
- paymentStatus (paid/partial/unpaid/not invoiced)
- externalAuditor: {firmName, contact, auditDeadline, status}
- auditBy: "internal" | "external"

## 6. Document Received
- Updated by: Audit Admin Assistant, Lead Audit Admin, Admin
- Fields: document name, date received, received by
- Multiple entries per client
- Flag: accountReceived (soft gate for Pre-audit)

## 7. Stage Change Gate
Required 3 fields: progress note + hours + next action
Blocks if any empty
At review stages (5, 6): additional review note (mandatory)

## 8. Daily Check-in
- One click per job: "I'm working on this today"
- Badge: green today / yellow 3-6 / red 7+
- Auto-alert: 7 days → Manager, 21 days → Partner
- Configurable in Settings

## 9. Audit Trail
Every action logged: who, when, what, from, to
Visible on every job: "Last updated by [user] at [time]"
Retention: 7 years (MIA minimum is 6)

## 10. Timesheet & Timecost

**Timesheet:**
- Staff log daily (Junior, Senior, Manager)
- Partner logs only OT
- Admin/Audit Admin/Secretarial: no timesheet
- Check-in button separate
- Entries editable until timesheet locked
- Lock status: Open → Reviewed → Billed (billing lock)

**Timecost:**
- hours × hourly rate (manual estimate set by Admin/MA/AAM)
- Budget hours + budget cost per job
- Variance visible
- Frozen when timesheet locked

## 11. Billing & Payments

**Triggers:** Printed, Tax submitted, Ready to Archive
- Manager/Senior/Partner ticks "Ready to Invoice"
- Conditions: timesheet locked + final fee keyed + discount approved
- Admin issues invoice (accounting software is source of truth)
- Credit term: 30 days default, per-client override
- Admin records payment, issues receipt, updates system

**Aging buckets:** 0-30 / 31-90 / 91-180 / 181-365 / 365+ days
**365+ rule:** alert Partner + Manager, repeat monthly until resolved or written off

## 12. Notifications (in-app bell + email)
- Manager comment
- Partner query raised
- Deadline 7 days / 1 day / overdue
- Stage change on your job
- New job assigned to you
- 7 days no update → Manager
- 21 days no update → Partner
- Weekly Monday report → Partner (configurable)

## 13. MIA Compliance
- ISA 230: track who did what, when
- Exception tracking (stage skip with reason + approver)
- Review notes mandatory at stages 5, 6
- Retention 7 years (exceeds MIA 6-year minimum)

## 14. CPD
- AAM records training sessions
- Auto-credit attendees
- MIA members: 40h target (auto)
- Non-MIA: Master Admin sets per staff
- Timesheet "Training/CPD" category = information only

## 15. Collections
- Outstanding = invoice − payments received
- Due date = invoice date + credit term (30 days default)
- Aging buckets
- Chase log (date, method, notes)
- 365+ rule: monthly alert + Partner explanation
- Manager My Progress + Partner Firm Overview sections

## 16. Commission Model (Phase 2)
- Audit 16%, Tax 20%, Secretarial 3%, Bookkeeping 10/20%
- Bookkeeping: staff 70% / outsourced 60% of invoice
- Pool split negotiated per client
- Per-client default, per-job override
- 5-year decay for resigned staff
- Walk-in rotation (immediate stop on resignation)
- Partner: only on personally-sourced clients
- Visibility: own line only

## 17. Tax Forms
- Form C (Sdn Bhd, PLT) — FYE + 7 months
- Form P (Partnership) — 30 Jun / 15 Jul
- Form B (Enterprise, Individual) — 30 Jun / 15 Jul
- Form BE (Individual) — 30 Apr / 15 May
- Form E (Employer) — 31 March
- Form EA (Employee) — end February
- CP204/CP204A — 30 days before basis period

## 18. Collections (10 total)
portfolios, jobs (includes progress), timesheet, staff, settings, billing, payments, auditlog, queries

## 19. Excluded
- No file upload (cloud later)
- No AMLA / KYC (manual)
- No client portal
- No mobile (desktop now, responsive later)
- ISQM module — handled separately in ABOT system, out of scope here

## 20. Build Phases

**Phase 1 (I build — 6 weeks):**
- Login + 5 roles
- Client Master Listing (grouped, search, filter)
- Audit 9-stage tracker
- Internal notes
- My Progress (Manager)
- Team Overview
- Manager Dashboard
- Notification bell
- Jobs Board (Board/Calendar/Client List)
- Daily timesheet
- Check-in button
- Timesheet lock
- Timecost
- Budget vs actual
- Utilisation %
- Audit trail
- Role-based visibility

**Phase 2 (friend builds — 6 weeks):**
- Collections + aging
- CPD via AAM
- Calendar (unified)
- Tax, Bookkeeping, Secretarial workflows
- Site Work view
- External auditor tracking
- Absence tracking
- All remaining roles
- Commission model
- Server-enforced permissions

**Out of scope (ABOT system):**
- ISQM Independence
- SoQM Evaluation
- File Inspection
- Consultation Log
- Raise Concern
- Partner ISQM Dashboard
- ISQM Deficiency gate
