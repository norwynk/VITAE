# Care Pathways (working title)

Early foundation for an assessment-led, clinician-reviewed health service: health assessment, clinician review of peptide pen pathways, reminders and adherence, check-ins, secure messaging and order handling.

**This is not a commissioned clinical service or a live medicine shop.** Every treatment in the catalogue is a fictional demo pathway that starts unverified and not purchasable. Demo payments are simulated, and live mode cannot take payment because no payment provider is integrated. Nothing is deployed.

## Stack

Next.js 16, React 19, TypeScript, Zod 4, Firebase (Auth, Firestore, Cloud Functions v2, Storage, Cloud Messaging, App Check, Cloud Scheduler).

## Run it

```bash
npm install
npm --prefix functions install
cp .env.example .env.local   # demo mode by default
npm run dev                  # http://localhost:3000, then open /app and pick a demo role
```

Demo data lives in `.demo/store.json` (git-ignored). Use **Reset demo data** in the app to start again.

## Checks

| Command | What it covers |
| --- | --- |
| `npm test` | Domain commands, transitions, role rules, projections, audit; demo sessions and store |
| `npm run test:rules` | Firestore and Storage rules in the emulator |
| `npm run test:firebase` | Auth + Firestore + Storage + callable Functions journey in the emulator, plus the reminder sweep |
| `npm run test:e2e` | Playwright journey across all roles against a production build in demo mode |
| `npm run typecheck`, `npm run lint`, `npm run functions:build`, `npm run build` | Static checks and builds |

The emulator tests need Java 21+. Playwright uses an installed Chromium; set `PLAYWRIGHT_CHROMIUM_PATH` if it can't find one.

## Where things live

- `src/domain/model.ts`: roles, collections, record types, scheduling, the `visible()` role projection, SA date helpers, reminder decision.
- `src/domain/commands.ts`: Zod command contract, role checks, business rules, `applyCommand()` and audit events. **The single path for every state change**, shared by demo and Firebase.
- `src/domain/documents.ts`: document quarantine and access rules.
- `src/domain/fixtures.ts`: fictional demo data only.
- `src/services/repository.ts`: the UI data boundary (Firebase callables or the demo HTTP adapter, chosen by `NEXT_PUBLIC_DATA_MODE`).
- `src/server/demo.ts`, `src/app/api/demo/route.ts`: demo persistence and encrypted, HTTP-only, SameSite=strict, 8-hour sessions. Refused in production unless `ALLOW_PRODUCTION_DEMO=true`.
- `functions/src/`: trusted backend (`provisionMember`, `getWorkspace`, `executeCommand`, `registerPushToken`, `registerDocument`, `accessDocument`, `sendTreatmentReminders`). Region `europe-west1`, max 10 instances, App Check enforced outside the emulator, MFA required for staff roles in production.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`: the deployed data boundary.
- `scripts/staff.ts`: operator tooling for staff roles and clinician assignments (`npm run staff -- …`).

## Commands

`onboard`, `request`, `review`, `adherence`, `notificationTime`, `measurement`, `checkout`, `deliveryAddress`, `message`, `note`, `nutrition`, `checkin`, `followup`, `catalogue`, `catalogueCreate`, `stockAdjust`, `withdrawConsent`, `orderStatus`, `readNotification`. Each one appends an audit event. See `commandSchema` and `COMMAND_ROLES` in `commands.ts`.

Key rules enforced on the server:

- Adults only; the four required consents are checked separately from optional communications and marketing.
- Only the actively assigned clinician can review, with a complete intake assessment and a future review date. An approval supersedes the previous one for the same treatment and stops its reminders.
- Checkout needs an active, purchasable, regulatorily verified treatment (with a real reference), a current approval covering the quantity (when required), stock, and an address. Live checkout creates `PAYMENT_PENDING` plus an `AWAITING_PROVIDER` payment; nobody can mark it paid by hand.
- Saving a delivery address never creates an order or payment.
- Only fulfilment can mark an order `DISPENSED`. Operations cannot complete clinical follow-ups or read clinical threads.
- Clinical notes are visible only to the assigned clinician.
- Reminders use the neutral sender label "Your care team" and generic lock-screen text.

## Not built yet (integration work, not existing features)

- South African payment provider, signed idempotent webhooks, reconciliation, refunds, invoices; reservation expiry policy.
- Pharmacy and dispensing partner, prescription artifacts and signatures, courier integration, inventory reconciliation.
- Virus scanning that moves documents from `QUARANTINED` to `CLEAN`. Until then, no uploaded document can be opened. There is also no upload UI yet; the callables exist.
- Lab and DNA vendor ordering, specimen logistics, results ingestion.
- Approved privacy, terms and clinical consent wording; POPIA roles, retention and data-subject rights; cross-border decision; clinical escalation service levels.
- Data export and deletion, rate limiting, command idempotency keys, cursor pagination (operations workspaces are capped at 250 records, audit at 100).
- A Firebase project, deployment, staff invitations, MFA enrolment UI, App Check setup, push-token registration in the browser.
- Regimen revision beyond issuing a new approval.
- A final service name: "Care Pathways" is a placeholder.
