'use client';
import { useEffect, useState } from 'react';
import { PURCHASE_BLOCK_MESSAGES, currentApproval, purchaseBlocks } from '@/domain/commands';
import {
  type Address,
  type ConsentType,
  type MeasurementKind,
  type RequestStatus,
  type Store,
  type TreatmentRequest,
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
import { penBrand } from '@/brand/pens';
import { MAX_SHORTLIST, useShortlist } from '@/hooks/useShortlist';
import { paymentAdapterFor } from '@/services/payment';
import { PenStage } from '../brand/Pen';
import { worldStyle } from '../brand/worldStyle';
import { Badge, Card, Empty, Notice, fmtDateTime, formValues, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';
import { OnboardingForm } from './OnboardingForm';

const TABS = ['Overview', 'Plan', 'Orders', 'Messages', 'My health'] as const;
type Tab = (typeof TABS)[number];

export function MemberHome() {
  const { workspace } = useWorkspace();
  const shortlist = useShortlist();
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<Tab>('Overview');
  // A pen linked from the site (?pen=) joins "My pens". A preference only, never a clinical input.
  const linked = useState(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('pen')))[0];
  const { add } = shortlist;
  useEffect(() => {
    if (linked) add(linked);
  }, [linked, add]);

  const member = workspace.store.members[workspace.actor.uid];
  if (!member) return <Notice tone="error">Your member record could not be found.</Notice>;

  if (!member.onboardedAt) {
    if (!started) return <ScreeningIntro onBegin={() => setStarted(true)} />;
    return <OnboardingForm />;
  }

  return (
    <div className="stack member">
      <NextStep onGo={setTab} />
      <div className="member-tabs" role="tablist" aria-label="Your account">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} className={tab === t ? 'is-current' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-Overview" aria-labelledby="tab-Overview" hidden={tab !== 'Overview'} className="stack">
        <MyPens />
        <Notifications />
      </div>
      <div role="tabpanel" id="panel-Plan" aria-labelledby="tab-Plan" hidden={tab !== 'Plan'} className="stack">
        <Plans />
        <div className="grid">
          <CheckIn />
          <Measurements />
        </div>
      </div>
      <div role="tabpanel" id="panel-Orders" aria-labelledby="tab-Orders" hidden={tab !== 'Orders'} className="stack">
        <div className="grid">
          <Ordering />
          <DeliveryAddress />
        </div>
        <Orders />
      </div>
      <div role="tabpanel" id="panel-Messages" aria-labelledby="tab-Messages" hidden={tab !== 'Messages'}>
        <Messages />
      </div>
      <div role="tabpanel" id="panel-My health" aria-labelledby="tab-My health" hidden={tab !== 'My health'} className="grid">
        <NutritionAndTesting />
        <Consents />
      </div>
    </div>
  );
}

function ScreeningIntro({ onBegin }: { onBegin: () => void }) {
  const { workspace } = useWorkspace();
  const { slugs } = useShortlist();
  const names = slugs.map((slug) => Object.values(workspace.store.treatments).find((t) => t.slug === slug)?.name).filter(Boolean);
  const first = Object.values(workspace.store.treatments).find((t) => t.slug === slugs[0]);
  const brand = first ? penBrand(first) : null;
  return (
    <section className="screening-intro" style={brand ? worldStyle(brand.colours) : ({ '--accent': 'var(--pink)' } as React.CSSProperties)}>
      <p className="eyebrow">Health screening{names.length ? ` · ${names.join(', ')}` : ''}</p>
      <h1 className="display">
        The fun part is picking it.
        <span className="serif-i">The important part is making sure it&apos;s right for you.</span>
      </h1>
      <ol className="screening-intro__path">
        <li>
          <strong>Your pens</strong>
          <span>{names.length ? 'Already chosen. You can change them.' : 'Pick up to three, or let your clinician suggest.'}</span>
        </li>
        <li>
          <strong>A few calm questions</strong>
          <span>About you, your health and your lifestyle. Five short steps.</span>
        </li>
        <li>
          <strong>A clinician reviews</strong>
          <span>They decide what is right for you, and tell you here.</span>
        </li>
      </ol>
      <div className="trust-row">
        <span>Private</span>
        <span>Adults 18+</span>
        <span>Reviewed by a clinician</span>
        <span>You can stop any time</span>
      </div>
      <div>
        <button type="button" onClick={onBegin}>
          Begin screening
        </button>
      </div>
    </section>
  );
}

const REQUEST_LABEL: Record<RequestStatus, string> = {
  OPEN: 'Waiting for your clinician',
  IN_REVIEW: 'Your clinician is reviewing',
  NEEDS_INFORMATION: 'Your clinician needs more information',
  APPROVED: 'Approved',
  DECLINED: 'Not right for you right now',
  ALTERNATIVE_RECOMMENDED: 'Your clinician suggests another pen',
};

/** Latest request per pen, newest first. */
function latestRequests(store: Store): TreatmentRequest[] {
  const byPen = new Map<string, TreatmentRequest>();
  for (const r of Object.values(store.treatmentRequests).sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (!byPen.has(r.treatmentId)) byPen.set(r.treatmentId, r);
  }
  return [...byPen.values()];
}

/** The one thing to do now, worked out from where the member is. */
function NextStep({ onGo }: { onGo: (tab: Tab) => void }) {
  const { workspace } = useWorkspace();
  const { store, actor } = workspace;
  const member = store.members[actor.uid];
  const now = today();
  const approval = Object.values(store.approvedTreatments).find((a) => isApprovalCurrent(a, now));
  const requests = latestRequests(store);
  const pending = requests.filter((r) => PENDING_REQUEST_STATUSES.includes(r.status));
  const needsInfo = requests.find((r) => r.status === 'NEEDS_INFORMATION');
  const unread = Object.values(store.notifications).filter((n) => !n.read).length;
  const regimen = approval && Object.values(store.regimens).find((r) => r.approvalId === approval.id && r.active);
  const recordedToday = approval && Object.values(store.adherenceEvents).some((e) => e.approvalId === approval.id && e.dueDate === now && e.action !== 'SNOOZED');
  const nextDose = regimen && nextScheduledDate(regimen, recordedToday ? addDays(now, 1) : now);
  const hasOrder = Object.keys(store.orders).length > 0;
  const focus = store.treatments[approval?.treatmentId ?? pending[0]?.treatmentId ?? requests[0]?.treatmentId ?? ''];
  const brand = focus ? penBrand(focus) : null;

  let title: string;
  let body: string;
  let action: { label: string; tab?: Tab; href?: string } | null = null;
  if (needsInfo) {
    title = 'Your clinician has a question.';
    body = `They need a little more information about ${treatmentName(store, needsInfo.treatmentId)}.`;
    action = { label: 'Read and reply', tab: 'Messages' };
  } else if (approval && nextDose === now && !recordedToday) {
    title = "Today's dose.";
    body = `Log your ${treatmentName(store, approval.treatmentId)} dose once you've taken it.`;
    action = { label: 'Log it', tab: 'Plan' };
  } else if (approval && !hasOrder) {
    title = "You're approved.";
    body = `Your clinician approved ${treatmentName(store, approval.treatmentId)}. Order your first pen when you're ready.`;
    action = { label: 'Order your pen', tab: 'Orders' };
  } else if (approval) {
    title = "You're on your plan.";
    body = nextDose ? `Next dose: ${nextDose === now ? 'today' : nextDose}.` : 'Your plan and reminders are in the Plan tab.';
    action = { label: 'See your plan', tab: 'Plan' };
  } else if (pending.length) {
    title = 'Your clinician is on it.';
    body = `${pending.length === 1 ? treatmentName(store, pending[0].treatmentId) + ' is' : `${pending.length} pens are`} with your clinician. We'll let you know here as soon as they decide.`;
  } else if (requests.length) {
    title = 'Your clinician has replied.';
    body = 'See their decision on each pen below.';
  } else {
    title = 'Screening done. Now pick a pen.';
    body = 'Choose up to three pens for your clinician to review, or take the quiz.';
    action = { label: 'Find your prick', href: '/find-your-prick' };
  }

  return (
    <section className="next-step" style={brand ? worldStyle(brand.colours) : undefined}>
      <div className="next-step__copy">
        <p className="eyebrow">Hey, {member.firstName}.</p>
        <h1 className="display next-step__title">{title}</h1>
        <p className="next-step__body">{body}</p>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {action?.tab && (
            <button type="button" className="btn light" onClick={() => action.tab && onGo(action.tab)}>
              {action.label}
            </button>
          )}
          {action?.href && (
            <a href={action.href} className="btn light">
              {action.label}
            </a>
          )}
          {unread > 0 && (
            <span className="badge">
              {unread} new update{unread === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <ol className="journey" aria-label="Your progress">
          <li className="is-done">Screening</li>
          <li className={approval || requests.some((r) => !PENDING_REQUEST_STATUSES.includes(r.status)) ? 'is-done' : pending.length ? 'is-current' : ''}>Clinician review</li>
          <li className={approval ? 'is-current' : ''}>Your plan</li>
        </ol>
      </div>
      {brand && focus && (
        <div className="next-step__art" aria-hidden="true">
          <span className="flip-card__glow" style={{ opacity: 1 }} />
          <PenStage colours={brand.colours} label={brand.penLabel} botanical={brand.botanical} angle={-56} fit={0.9} />
        </div>
      )}
    </section>
  );
}

/** Every pen the member has asked about, with its status, plus room to add more. */
function MyPens() {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const requests = latestRequests(store);
  const active = requests.filter((r) => PENDING_REQUEST_STATUSES.includes(r.status) || r.status === 'APPROVED');
  const asked = new Set(requests.filter((r) => r.status !== 'DECLINED').map((r) => r.treatmentId));
  const addable = Object.values(store.treatments).filter((t) => t.active && t.public && !asked.has(t.id));
  const [toAdd, setToAdd] = useState('');
  const room = active.length < MAX_SHORTLIST;
  return (
    <section className="card my-pens">
      <h2>My pens</h2>
      {!requests.length && <Empty>No pens with your clinician yet.</Empty>}
      <ul className="plain my-pens__list">
        {requests.map((r) => {
          const t = store.treatments[r.treatmentId];
          if (!t) return null;
          const b = penBrand(t);
          return (
            <li key={r.id} className="my-pens__row" style={worldStyle(b.colours)}>
              <span className="my-pens__dot" />
              <div className="my-pens__main">
                <strong>{t.name}</strong>
                <span className="small">{REQUEST_LABEL[r.status]}</span>
                {r.decisionNote && <span className="small muted">“{r.decisionNote}”</span>}
                {r.alternativeTreatmentId && <span className="small">Suggested instead: {treatmentName(store, r.alternativeTreatmentId)}</span>}
              </div>
              {r.status === 'APPROVED' && <Badge tone="good">Approved</Badge>}
            </li>
          );
        })}
      </ul>
      {room && addable.length > 0 && (
        <form
          className="row my-pens__add"
          onSubmit={async (e) => {
            e.preventDefault();
            if (toAdd && (await run({ type: 'request', treatmentId: toAdd, reason: 'Added from my account' }, 'Sent to your clinician'))) setToAdd('');
          }}
        >
          <label style={{ flex: 1 }}>
            Add another pen
            <select value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
              <option value="">Choose…</option>
              {addable.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy || !toAdd}>
            Ask my clinician
          </button>
        </form>
      )}
      {!room && <p className="small muted">You can have up to {MAX_SHORTLIST} pens with your clinician at a time.</p>}
    </section>
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
