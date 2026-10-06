'use client';
import { useState } from 'react';
import { PURCHASE_BLOCK_MESSAGES, currentApproval, purchaseBlocks } from '@/domain/commands';
import {
  type Address,
  type ConsentType,
  type MeasurementKind,
  type Store,
  MEASUREMENT_UNITS,
  PENDING_REQUEST_STATUSES,
  REQUIRED_CONSENTS,
  SA_PROVINCES,
  THREAD_TOPICS,
  addDays,
  describeSchedule,
  formatRand,
  isApprovalCurrent,
  localDate,
  nextScheduledDate,
  scheduledDates,
} from '@/domain/model';
import { paymentAdapterFor } from '@/services/payment';
import { Badge, Card, Empty, Notice, fmtDateTime, formValues, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';
import { OnboardingForm } from './OnboardingForm';

export function MemberHome() {
  const { workspace } = useWorkspace();
  const member = workspace.store.members[workspace.actor.uid];
  if (!member) return <Notice tone="error">Your member record could not be found.</Notice>;
  if (!member.onboardedAt) return <OnboardingForm />;

  return (
    <div className="stack">
      <h1>Welcome, {member.firstName}</h1>
      <Notifications />
      <div className="grid">
        <Plans />
        <Pathways />
      </div>
      <div className="grid">
        <Ordering />
        <DeliveryAddress />
      </div>
      <Orders />
      <div className="grid">
        <CheckIn />
        <Measurements />
      </div>
      <Messages />
      <div className="grid">
        <NutritionAndTesting />
        <Consents />
      </div>
    </div>
  );
}

function today() {
  return localDate(new Date());
}

function treatmentName(store: Store, id: string) {
  return store.treatments[id]?.name ?? 'Treatment';
}

function Notifications() {
  const { workspace, run, busy } = useWorkspace();
  const unread = Object.values(workspace.store.notifications)
    .filter((n) => !n.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!unread.length) return null;
  return (
    <Card title={`Notifications (${unread.length})`}>
      <ul className="plain">
        {unread.map((n) => (
          <li key={n.id} className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              <strong>{n.title}</strong> <span className="muted small">{fmtDateTime(n.createdAt)}</span>
              <br />
              <span className="small">{n.body}</span>
            </span>
            <button type="button" className="secondary" disabled={busy} onClick={() => run({ type: 'readNotification', notificationId: n.id }, 'Marked as read')}>
              Mark read
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Pathways() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const requests = Object.values(store.treatmentRequests).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = new Set(requests.filter((r) => PENDING_REQUEST_STATUSES.includes(r.status)).map((r) => r.treatmentId));
  const pathways = Object.values(store.treatments).filter((t) => t.active && t.public);
  return (
    <Card title="Pathways">
      <ul className="plain">
        {pathways.map((t) => (
          <li key={t.id} className="card">
            <strong>{t.name}</strong>
            <p className="small">{t.summary}</p>
            {pending.has(t.id) ? (
              <Badge>Request in review</Badge>
            ) : (
              <button type="button" disabled={busy} onClick={() => run({ type: 'request', treatmentId: t.id }, 'Request sent to your clinician')}>
                Request clinician review
              </button>
            )}
          </li>
        ))}
      </ul>
      {requests.length > 0 && (
        <>
          <h3 style={{ marginTop: '1rem' }}>Your requests</h3>
          <ul className="plain small">
            {requests.map((r) => (
              <li key={r.id}>
                {treatmentName(store, r.treatmentId)}: <Badge tone={r.status === 'APPROVED' ? 'good' : undefined}>{humanise(r.status)}</Badge>
                {r.decisionNote && <span className="muted"> — {r.decisionNote}</span>}
                {r.alternativeTreatmentId && <span> Suggested instead: {treatmentName(store, r.alternativeTreatmentId)}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Plans() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const now = today();
  const plans = Object.values(store.approvedTreatments).filter((a) => isApprovalCurrent(a, now));
  return (
    <Card title="Your treatment plans">
      {!plans.length && <Empty>No active plans. Plans appear here after a clinician approves one.</Empty>}
      {plans.map((a) => {
        const regimen = Object.values(store.regimens).find((r) => r.approvalId === a.id && r.active);
        const reminder = Object.values(store.reminders).find((r) => r.approvalId === a.id && r.active);
        if (!regimen) return null;
        const recorded = new Set(
          Object.values(store.adherenceEvents)
            .filter((e) => e.approvalId === a.id && e.action !== 'SNOOZED')
            .map((e) => e.dueDate),
        );
        const due = scheduledDates(regimen, addDays(now, -6), now).filter((d) => !recorded.has(d)).reverse();
        const next = nextScheduledDate(regimen, addDays(now, 1));
        return (
          <div key={a.id} className="stack">
            <div>
              <strong>{treatmentName(store, a.treatmentId)}</strong>
              <div className="small">
                {regimen.dose} {regimen.doseUnit} · {describeSchedule(regimen.schedule)} · valid until {a.expiresOn}
              </div>
              {regimen.instructions && <div className="small muted">{regimen.instructions}</div>}
              <div className="small muted">Set by your clinician. Contact your care team to change it.</div>
            </div>
            <div>
              <h3>Doses to record</h3>
              {!due.length && <Empty>Nothing to record{next ? `. Next dose: ${next}` : ''}.</Empty>}
              <ul className="plain">
                {due.map((d) => (
                  <li key={d} className="row">
                    <span style={{ minWidth: '7rem' }}>{d === now ? 'Today' : d}</span>
                    <button type="button" disabled={busy} onClick={() => run({ type: 'adherence', approvalId: a.id, dueDate: d, action: 'TAKEN' }, 'Dose recorded as taken')}>
                      Taken
                    </button>
                    <button type="button" className="secondary" disabled={busy} onClick={() => run({ type: 'adherence', approvalId: a.id, dueDate: d, action: 'MISSED' }, 'Dose recorded as missed')}>
                      Missed
                    </button>
                    {d === now && (
                      <button type="button" className="secondary" disabled={busy} onClick={() => run({ type: 'adherence', approvalId: a.id, dueDate: d, action: 'SNOOZED', snoozeMinutes: 30 }, 'Reminder snoozed for 30 minutes')}>
                        Snooze 30 min
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {reminder && (
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run({ type: 'notificationTime', reminderId: reminder.id, time: formValues(e.currentTarget).time }, 'Reminder time updated');
                }}
              >
                <label style={{ flexDirection: 'row', alignItems: 'center' }}>
                  Reminder time
                  <input name="time" type="time" defaultValue={reminder.time} required style={{ width: 'auto' }} />
                </label>
                <button type="submit" className="secondary" disabled={busy}>
                  Save time
                </button>
              </form>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function Ordering() {
  const { workspace, run, busy } = useWorkspace();
  const { store, actor, mode } = workspace;
  const now = today();
  const member = store.members[actor.uid];
  const candidates = Object.values(store.treatments).filter(
    (t) =>
      t.active &&
      (currentApproval(store, actor.uid, t.id, now) || (!t.requiresPrescription && !t.requiresClinicianApproval && t.public)),
  );
  const payment = paymentAdapterFor(mode);
  return (
    <Card title="Order treatment">
      <Notice tone="warn">{payment.memberNotice}</Notice>
      {!candidates.length && <Empty>Nothing is available to order. Orders open only after a clinician approves a plan.</Empty>}
      {candidates.map((t) => {
        const approval = currentApproval(store, actor.uid, t.id, now);
        // Stock is checked by the server; members do not see inventory levels.
        const blocks = purchaseBlocks(store, actor.uid, t, 1, now).filter((b) => b !== 'OUT_OF_STOCK');
        return (
          <form
            key={t.id}
            className="stack"
            style={{ marginTop: '0.75rem' }}
            onSubmit={(e) => {
              e.preventDefault();
              const qty = Number(formValues(e.currentTarget).quantity);
              void run(
                { type: 'checkout', treatmentId: t.id, quantity: qty },
                mode === 'demo' ? 'Demo order placed. No money was charged.' : 'Order created and waiting for payment.',
              );
            }}
          >
            <strong>{t.name}</strong>
            <div className="small">
              {formatRand(t.priceCents)} {t.billing === 'MONTHLY' ? 'per month' : 'per pack'}
              {approval && ` · ${approval.remainingQuantity} of ${approval.approvedQuantity} approved packs remaining`}
            </div>
            {blocks.length > 0 ? (
              <Notice tone="info">{PURCHASE_BLOCK_MESSAGES[blocks[0]]}</Notice>
            ) : !member?.deliveryAddress ? (
              <Notice tone="info">Save a delivery address before ordering.</Notice>
            ) : (
              <div className="row">
                <label style={{ flexDirection: 'row', alignItems: 'center' }}>
                  Quantity
                  <input name="quantity" type="number" min={1} max={Math.min(6, approval?.remainingQuantity ?? 6)} defaultValue={1} style={{ width: '5rem' }} />
                </label>
                <button type="submit" disabled={busy}>
                  {mode === 'demo' ? 'Place simulated order' : 'Place order'}
                </button>
              </div>
            )}
          </form>
        );
      })}
    </Card>
  );
}

export function AddressFields({ value }: { value?: Address }) {
  return (
    <div className="form-grid">
      <label>
        Recipient
        <input name="recipient" defaultValue={value?.recipient} required />
      </label>
      <label>
        Street address
        <input name="line1" defaultValue={value?.line1} required />
      </label>
      <label>
        Complex or building (optional)
        <input name="line2" defaultValue={value?.line2} />
      </label>
      <label>
        Suburb
        <input name="suburb" defaultValue={value?.suburb} required />
      </label>
      <label>
        City
        <input name="city" defaultValue={value?.city} required />
      </label>
      <label>
        Province
        <select name="province" defaultValue={value?.province ?? ''} required>
          <option value="" disabled>
            Choose…
          </option>
          {SA_PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label>
        Postal code
        <input name="postalCode" defaultValue={value?.postalCode} inputMode="numeric" pattern="\d{4}" required />
      </label>
      <label>
        Delivery phone
        <input name="phone" type="tel" defaultValue={value?.phone} required />
      </label>
    </div>
  );
}

function DeliveryAddress() {
  const { workspace, run, busy } = useWorkspace();
  const saved = workspace.store.members[workspace.actor.uid]?.deliveryAddress;
  return (
    <Card title="Delivery address">
      <p className="muted small">Saving an address does not place an order. It is reused when you order later.</p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const v = formValues(e.currentTarget);
          void run(
            {
              type: 'deliveryAddress',
              address: {
                recipient: v.recipient,
                line1: v.line1,
                line2: v.line2 || undefined,
                suburb: v.suburb,
                city: v.city,
                province: v.province as Address['province'],
                postalCode: v.postalCode,
                phone: v.phone,
              },
            },
            'Delivery address saved',
          );
        }}
      >
        <AddressFields value={saved} />
        <div>
          <button type="submit" disabled={busy}>
            Save address
          </button>
        </div>
      </form>
    </Card>
  );
}

function Orders() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const orders = Object.values(store.orders).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!orders.length) return null;
  return (
    <Card title="Your orders">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Placed</th>
              <th>Treatment</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{fmtDateTime(o.createdAt)}</td>
                <td>{treatmentName(store, o.treatmentId)}</td>
                <td>{o.quantity}</td>
                <td>{formatRand(o.totalCents)}</td>
                <td>
                  {humanise(o.status)} {o.simulated && <Badge tone="alert">Simulated</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CheckIn() {
  const { run, busy } = useWorkspace();
  return (
    <Card title="Health check-in">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const v = formValues(form);
          const needSupport = v.checked('needSupport');
          const ok = await run(
            { type: 'checkin', mood: Number(v.mood), energy: Number(v.energy), sideEffects: v.checked('sideEffects'), needSupport, notes: v.notes },
            needSupport ? 'Check-in saved. Your clinician has been alerted.' : 'Check-in saved',
          );
          if (ok) form.reset();
        }}
      >
        <div className="form-grid">
          <label>
            Mood (1–5)
            <input name="mood" type="number" min={1} max={5} defaultValue={3} required />
          </label>
          <label>
            Energy (1–5)
            <input name="energy" type="number" min={1} max={5} defaultValue={3} required />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" name="sideEffects" /> I have noticed side effects
        </label>
        <label className="check">
          <input type="checkbox" name="needSupport" /> I need support from my clinician
        </label>
        <label>
          Notes
          <textarea name="notes" />
        </label>
        <Notice tone="warn">If this is an emergency, call 10177 or go to your nearest emergency unit.</Notice>
        <div>
          <button type="submit" disabled={busy}>
            Save check-in
          </button>
        </div>
      </form>
    </Card>
  );
}

function Measurements() {
  const { workspace, run, busy } = useWorkspace();
  const [kind, setKind] = useState<MeasurementKind>('WEIGHT');
  const recent = Object.values(workspace.store.measurements)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, 6);
  return (
    <Card title="Measurements">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const v = formValues(form);
          const value = Number(v.value);
          const measurement =
            kind === 'BLOOD_PRESSURE'
              ? { kind, unit: 'mmHg' as const, value, value2: Number(v.value2) }
              : ({ kind, unit: MEASUREMENT_UNITS[kind], value } as never);
          if (await run({ type: 'measurement', measurement }, 'Measurement saved')) form.reset();
        }}
      >
        <div className="form-grid">
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as MeasurementKind)}>
              <option value="WEIGHT">Weight (kg)</option>
              <option value="SLEEP">Sleep (hours)</option>
              <option value="BLOOD_PRESSURE">Blood pressure (mmHg)</option>
              <option value="BODY_COMPOSITION">Body fat (%)</option>
            </select>
          </label>
          <label>
            {kind === 'BLOOD_PRESSURE' ? 'Systolic' : 'Value'}
            <input name="value" type="number" step="0.1" required />
          </label>
          {kind === 'BLOOD_PRESSURE' && (
            <label>
              Diastolic
              <input name="value2" type="number" required />
            </label>
          )}
        </div>
        <div>
          <button type="submit" disabled={busy}>
            Save measurement
          </button>
        </div>
      </form>
      <ul className="plain small" style={{ marginTop: '0.75rem' }}>
        {recent.map((m) => (
          <li key={m.id}>
            {humanise(m.kind)}: {m.value}
            {m.value2 !== undefined ? `/${m.value2}` : ''} {m.unit} <span className="muted">{fmtDateTime(m.recordedAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Messages() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const threads = Object.values(store.messageThreads).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  return (
    <Card title="Messages">
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const v = formValues(form);
          const topic = v.topic as (typeof THREAD_TOPICS)[number];
          const ok = await run(
            { type: 'message', topic, body: v.body },
            topic === 'SIDE_EFFECT_CONCERN' ? 'Message sent and flagged for your clinician' : 'Message sent',
          );
          if (ok) form.reset();
        }}
      >
        <div className="form-grid">
          <label>
            Topic
            <select name="topic" defaultValue="GENERAL">
              <option value="GENERAL">General question</option>
              <option value="ORDER_DELIVERY">Order or delivery</option>
              <option value="CLINICAL">Clinical question</option>
              <option value="SIDE_EFFECT_CONCERN">Side effect or concern</option>
            </select>
          </label>
        </div>
        <label>
          New message
          <textarea name="body" required />
        </label>
        <div>
          <button type="submit" disabled={busy}>
            Send
          </button>
        </div>
      </form>
      <div className="stack" style={{ marginTop: '1rem' }}>
        {threads.map((t) => (
          <Thread key={t.id} threadId={t.id} store={store} onReply={(body) => run({ type: 'message', threadId: t.id, body }, 'Reply sent')} busy={busy} />
        ))}
      </div>
    </Card>
  );
}

export function Thread({
  threadId,
  store,
  onReply,
  busy,
}: {
  threadId: string;
  store: Store;
  onReply: (body: string) => Promise<boolean>;
  busy: boolean;
}) {
  const thread = store.messageThreads[threadId];
  const messages = Object.values(store.messages)
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <div className="card">
      <div className="row">
        <strong>{thread.subject}</strong>
        <Badge>{humanise(thread.topic)}</Badge>
        {thread.escalated && <Badge tone="alert">Escalated to clinician</Badge>}
      </div>
      <ul className="plain small" style={{ margin: '0.5rem 0' }}>
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.authorRole === 'MEMBER' ? 'Member' : humanise(m.authorRole)}</strong>{' '}
            <span className="muted">{fmtDateTime(m.createdAt)}</span>
            <br />
            {m.body}
          </li>
        ))}
      </ul>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (await onReply(formValues(form).body)) form.reset();
        }}
      >
        <input name="body" aria-label="Reply" placeholder="Reply…" required style={{ flex: 1, minWidth: '12rem' }} />
        <button type="submit" className="secondary" disabled={busy}>
          Reply
        </button>
      </form>
    </div>
  );
}

function NutritionAndTesting() {
  const { workspace } = useWorkspace();
  const nutrition = workspace.store.nutritionProfiles[workspace.actor.uid];
  return (
    <Card title="Nutrition and testing">
      {nutrition ? (
        <p>
          Daily targets from your clinician: {nutrition.calorieTarget} kcal, {nutrition.proteinTargetG} g protein
          {nutrition.carbTargetG !== undefined && `, ${nutrition.carbTargetG} g carbohydrate`}
          {nutrition.fatTargetG !== undefined && `, ${nutrition.fatTargetG} g fat`}.
          {nutrition.notes && <span className="muted"> {nutrition.notes}</span>}
        </p>
      ) : (
        <Empty>Your clinician has not set nutrition targets yet.</Empty>
      )}
      <p className="muted small">
        A clinician will determine whether testing is appropriate and, if indicated, arrange a home kit or designated
        location. Results are not available in the app yet.
      </p>
    </Card>
  );
}

function Consents() {
  const { workspace, run, busy } = useWorkspace();
  const consents = Object.values(workspace.store.consents);
  return (
    <Card title="Your consents">
      <ul className="plain small">
        {consents.map((c) => (
          <li key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              {humanise(c.type)}: {c.granted ? <Badge tone="good">Given</Badge> : <Badge>{c.withdrawnAt ? 'Withdrawn' : 'Not given'}</Badge>}
            </span>
            {c.granted && (
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => {
                  const required = (REQUIRED_CONSENTS as readonly ConsentType[]).includes(c.type);
                  if (required && !window.confirm('This consent is needed to provide your care. Your care team will contact you. Withdraw it?')) return;
                  void run({ type: 'withdrawConsent', consentType: c.type }, 'Consent withdrawn. Your care team has been notified.');
                }}
              >
                Withdraw
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
