'use client';
import { useState } from 'react';
import type { Schedule, Store, TreatmentRequest } from '@/domain/model';
import {
  PENDING_REQUEST_STATUSES,
  activeAssignedMemberIds,
  addDays,
  describeSchedule,
  isApprovalCurrent,
  localDate,
} from '@/domain/model';
import type { IntakeAnswers } from '@/domain/intake';
import { type SafetyFlags, flagCount, safetyFlags } from '@/domain/safety';
import { waitedLabel, waitingOnClinician, workingHours } from '@/domain/waiting';
import { IntakeReview } from '../screening/IntakeReview';
import { Thread } from '../member/MemberHome';
import { Badge, Card, Empty, Notice, fmtDateTime, formValues, humanise } from '../ui';
import { useWorkspace } from '../workspace-context';

export function ClinicianHome() {
  const { workspace } = useWorkspace();
  const { store, actor } = workspace;
  // Whoever has waited longest comes first.
  const waiting = waitingOnClinician(store);
  const waitingSince = new Map([...waiting].reverse().map((i) => [i.memberId, i.since]));
  const memberIds = [...activeAssignedMemberIds(store, actor.uid)]
    .filter((id) => store.members[id])
    .sort((a, b) => (waitingSince.get(a) ?? '9999').localeCompare(waitingSince.get(b) ?? '9999'));
  const now = new Date();
  const [selected, setSelected] = useState<string | null>(memberIds[0] ?? null);
  // Only while still unanswered: once they've been replied to or called, the alert goes.
  const urgent = new Set(waiting.filter((i) => i.kind === 'URGENT').map((i) => i.key));
  const escalated = Object.values(store.messageThreads).filter((t) => urgent.has(`msg_${t.id}`));
  const openRequests = Object.values(store.treatmentRequests).filter((r) => PENDING_REQUEST_STATUSES.includes(r.status));

  return (
    <div className="stack">
      <h1>Clinician workspace</h1>
      {escalated.length > 0 && (
        <Notice tone="error">
          {escalated.length} escalated concern{escalated.length === 1 ? '' : 's'} need attention. Open the member to respond.
        </Notice>
      )}
      <Card title="Assigned members">
        {!memberIds.length && <Empty>No members are assigned to you.</Empty>}
        <div className="tabs">
          {memberIds.map((id) => {
            const m = store.members[id];
            const open = openRequests.filter((r) => r.memberId === id).length;
            const alerts = escalated.filter((t) => t.memberId === id).length;
            const since = waitingSince.get(id);
            const flags = openRequests
              .filter((r) => r.memberId === id && store.treatments[r.treatmentId])
              .reduce((n, r) => n + flagCount(safetyFlags(store, id, store.treatments[r.treatmentId])), 0);
            return (
              <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}>
                {m.firstName} {m.lastName}
                {open > 0 && ` · ${open} request${open === 1 ? '' : 's'}`}
                {since && ` · waiting ${waitedLabel(workingHours(since, now))}`}
                {alerts > 0 && ' · concern'}
                {flags > 0 && ` · ⚠ ${flags} safety flag${flags === 1 ? '' : 's'}`}
              </button>
            );
          })}
        </div>
      </Card>
      {selected && <MemberChart key={selected} memberId={selected} />}
    </div>
  );
}

/** The member's preparatory questionnaire, section by section, in the words they were asked. */
function Questionnaire({ answers, updated }: { answers: IntakeAnswers; updated?: string }) {
  return (
    <Card title={updated ? `Questionnaire (updated ${fmtDateTime(updated)})` : 'Questionnaire'}>
      <IntakeReview answers={answers} open={['why', 'history']} />
    </Card>
  );
}

function MemberChart({ memberId }: { memberId: string }) {
  const { workspace, run, busy } = useWorkspace();
  const { store } = workspace;
  const m = store.members[memberId];
  const history = store.medicalHistories[memberId];
  const lifestyle = store.lifestyleProfiles[memberId];
  const goals = Object.values(store.memberGoals).filter((g) => g.memberId === memberId);
  // Newest screening first: a member who screens again for another pen sends fresh answers.
  const intakes = Object.values(store.healthAssessments)
    .filter((a) => a.memberId === memberId && a.kind === 'INTAKE')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  // A pen asked for from the account carries only its safety answers, so the questionnaire is the newest full one.
  const full = intakes.filter((a) => a.intake);
  const intake = full[0] ?? intakes[0];
  // Pen answers from every screening, the newest answer to each question kept.
  const penAnswers = [...new Map(intakes.flatMap((a) => a.penAnswers ?? []).reverse().map((a) => [a.questionId, a])).values()];
  const repeats = Object.values(store.repeatDeliveries).filter((r) => r.memberId === memberId && (r.status === 'ACTIVE' || r.status === 'PAUSED'));
  const checkins = Object.values(store.healthAssessments)
    .filter((a) => a.memberId === memberId && a.kind === 'CHECKIN')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const requests = Object.values(store.treatmentRequests)
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const threads = Object.values(store.messageThreads)
    .filter((t) => t.memberId === memberId)
    .sort((a, b) => Number(b.escalated) - Number(a.escalated) || b.lastMessageAt.localeCompare(a.lastMessageAt));

  const pending = requests.filter((r) => PENDING_REQUEST_STATUSES.includes(r.status) && store.treatments[r.treatmentId]);
  const flagged = pending
    .map((r) => ({ name: store.treatments[r.treatmentId].name, flags: safetyFlags(store, memberId, store.treatments[r.treatmentId]) }))
    .filter((p) => flagCount(p.flags) > 0);

  return (
    <div className="stack">
      {flagged.length > 0 && (
        <Notice tone="error">
          <strong>Safety flags before you decide.</strong>
          {flagged.map((p) => (
            <div key={p.name} style={{ marginTop: '0.5rem' }}>
              <strong>{p.name}</strong>
              <FlagList flags={p.flags} />
            </div>
          ))}
        </Notice>
      )}
      <Calls memberId={memberId} />
      <div className="grid">
        <Card title={`${m.firstName} ${m.lastName}`}>
          {!m.onboardedAt ? (
            <Empty>Onboarding not complete yet.</Empty>
          ) : (
            <ul className="plain small">
              {/* The clinician calls every member before deciding. */}
              {m.phone && (
                <li>
                  Phone: <a href={`tel:${m.phone.replace(/\s/g, '')}`}>{m.phone}</a>
                </li>
              )}
              {m.email && (
                <li>
                  Email: <a href={`mailto:${m.email}`}>{m.email}</a>
                </li>
              )}
              <li>Date of birth: {m.dateOfBirth}</li>
              <li>
                Location: {m.city}, {m.province}
              </li>
              <li>Height: {m.heightCm} cm</li>
              <li>Goals: {goals.flatMap((g) => g.goals).join(', ') || '—'}</li>
              <li>Assessment: {intake ? <Badge tone="good">Complete</Badge> : <Badge tone="alert">Missing</Badge>}</li>
              <li>Open to testing: {intake?.testingInterest ? 'Yes' : 'No'}</li>
            </ul>
          )}
        </Card>
        {intake?.intake ? <Questionnaire answers={intake.intake.answers} updated={full.length > 1 ? intake.completedAt : undefined} /> : null}
        {penAnswers.length ? (
          <Card title="Pen-specific answers">
            <ul className="plain small stack" style={{ gap: '0.5rem' }}>
              {[...penAnswers]
                .sort((a, b) => Number(b.flagged) - Number(a.flagged))
                .map((a) => (
                  <li key={a.questionId}>
                    {a.flagged && <Badge tone="alert">Look at this</Badge>} {a.question}
                    <br />
                    <strong>{a.answer}</strong>
                  </li>
                ))}
            </ul>
          </Card>
        ) : null}
        <Card title="Health history">
          {history ? (
            <ul className="plain small">
              <li>Conditions: {history.conditions.join(', ') || 'None reported'}</li>
              <li>Medications: {history.medications || 'None reported'}</li>
              <li>Allergies: {history.allergies || 'None reported'}</li>
              <li>Pregnant or breastfeeding: {history.pregnancyOrBreastfeeding ? 'Yes' : 'No'}</li>
              {history.reproductiveHealth && (
                <>
                  <li>
                    Pregnant: {history.reproductiveHealth.pregnant ? 'Yes' : 'No'} · Breastfeeding:{' '}
                    {history.reproductiveHealth.breastfeeding ? 'Yes' : 'No'} · Planning pregnancy (12 months):{' '}
                    {history.reproductiveHealth.planningPregnancy ? 'Yes' : 'No'}
                  </li>
                  <li>Contraception: {history.reproductiveHealth.contraception || 'Not stated'}</li>
                  <li>Menopause stage: {humanise(history.reproductiveHealth.menopauseStage)}</li>
                </>
              )}
              <li>Previous peptide use: {history.previousPeptideUse ? 'Yes' : 'No'}</li>
              {history.notes && <li>Notes: {history.notes}</li>}
              {lifestyle && (
                <li>
                  Lifestyle: {humanise(lifestyle.activityLevel)} activity, {lifestyle.sleepHours} h sleep,{' '}
                  {lifestyle.smoking ? 'smokes' : 'non-smoker'}, {lifestyle.alcoholUnitsPerWeek} units/week
                </li>
              )}
              {repeats.map((r) => (
                <li key={r.id}>
                  On repeat: {store.treatments[r.treatmentId]?.name} · {humanise(r.status)}
                  {r.status === 'ACTIVE' && ` · next pen ${r.nextShipDate}`}
                  {r.holdFollowUpId && <> · <Badge tone="alert">Held for your follow-up</Badge></>}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No history yet.</Empty>
          )}
        </Card>
      </div>

      <Card title="Requests">
        {!requests.length && <Empty>No requests.</Empty>}
        <div className="stack">
          {requests.map((r) =>
            PENDING_REQUEST_STATUSES.includes(r.status) ? (
              <ReviewForm key={r.id} request={r} store={store} />
            ) : (
              <div key={r.id} className="small">
                {store.treatments[r.treatmentId]?.name}: <Badge>{humanise(r.status)}</Badge> {r.decisionNote}
              </div>
            ),
          )}
        </div>
      </Card>

      <div className="grid">
        <Plans memberId={memberId} />
        <FollowUps memberId={memberId} />
      </div>

      <div className="grid">
        <Card title="Measurements and check-ins">
          <ul className="plain small">
            {Object.values(store.measurements)
              .filter((x) => x.memberId === memberId)
              .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
              .slice(0, 8)
              .map((x) => (
                <li key={x.id}>
                  {humanise(x.kind)} {x.value}
                  {x.value2 !== undefined ? `/${x.value2}` : ''} {x.unit} <span className="muted">{fmtDateTime(x.recordedAt)}</span>
                </li>
              ))}
            {checkins.slice(0, 5).map((c) => (
              <li key={c.id}>
                Check-in: mood {c.checkin?.mood}, energy {c.checkin?.energy}
                {c.checkin?.sideEffects && ' · side effects'}
                {c.checkin?.needSupport && <Badge tone="alert">Asked for support</Badge>} <span className="muted">{fmtDateTime(c.completedAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Nutrition memberId={memberId} />
      </div>

      <Notes memberId={memberId} />

      <Card title="Messages">
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (await run({ type: 'message', memberId, topic: 'CLINICAL', subject: 'Message from your clinician', body: formValues(form).body }, 'Message sent')) form.reset();
          }}
        >
          <input name="body" aria-label="New message to member" placeholder="Start a new clinical conversation…" required style={{ flex: 1, minWidth: '12rem' }} />
          <button type="submit" disabled={busy}>
            Send
          </button>
        </form>
        <div className="stack" style={{ marginTop: '0.75rem' }}>
          {threads.map((t) => (
            <Thread key={t.id} threadId={t.id} store={store} busy={busy} onReply={(body) => run({ type: 'message', threadId: t.id, memberId, body }, 'Reply sent')} />
          ))}
        </div>
      </Card>
    </div>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function FlagList({ flags }: { flags: SafetyFlags }) {
  return (
    <ul className="small" style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem' }}>
      {flags.unanswered.length > 0 && (
        <li>
          <strong>Safety check not answered:</strong> {flags.unanswered.join(' · ')} Ask before approving.
        </li>
      )}
      {flags.answers.map((a) => (
        <li key={a.questionId}>
          {a.question} <strong>{a.answer}</strong>
        </li>
      ))}
      {flags.history.map((h) => (
        <li key={h}>{h}</li>
      ))}
    </ul>
  );
}

/** Shown first on every decision: what the clinician must look at for this pen. */
function RequestFlags({ flags }: { flags: SafetyFlags }) {
  if (!flagCount(flags)) return <p className="small muted">No safety flags for this pen.</p>;
  return (
    <Notice tone="error">
      <strong>
        ⚠ {flagCount(flags)} safety flag{flagCount(flags) === 1 ? '' : 's'}: look at these first
      </strong>
      <FlagList flags={flags} />
    </Notice>
  );
}

function ReviewForm({ request, store }: { request: TreatmentRequest; store: Store }) {
  const { run, busy } = useWorkspace();
  const [decision, setDecision] = useState<'APPROVED' | 'DECLINED' | 'NEEDS_INFORMATION' | 'ALTERNATIVE_RECOMMENDED'>('APPROVED');
  const [scheduleKind, setScheduleKind] = useState<Schedule['kind']>('WEEKLY');
  const today = localDate(new Date());
  const treatment = store.treatments[request.treatmentId];
  const alternatives = Object.values(store.treatments).filter((t) => t.id !== request.treatmentId && t.active);

  return (
    <form
      className="card stack"
      aria-label={`Review ${treatment?.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        const v = formValues(e.currentTarget);
        let schedule: Schedule;
        switch (scheduleKind) {
          case 'DAILY':
            schedule = { kind: 'DAILY' };
            break;
          case 'WEEKLY':
            schedule = { kind: 'WEEKLY', weekday: Number(v.weekday) };
            break;
          case 'WEEKDAYS':
            schedule = { kind: 'WEEKDAYS', weekdays: WEEKDAYS.map((_, i) => i).filter((i) => v.checked(`wd${i}`)) };
            break;
          case 'EVERY_N_DAYS':
            schedule = { kind: 'EVERY_N_DAYS', interval: Number(v.interval) };
            break;
          case 'CUSTOM':
            schedule = { kind: 'CUSTOM', dates: v.dates.split(',').map((d) => d.trim()).filter(Boolean) };
            break;
        }
        void run(
          {
            type: 'review',
            requestId: request.id,
            memberId: request.memberId,
            decision,
            note: v.note,
            reviewDate: v.reviewDate,
            alternativeTreatmentId: decision === 'ALTERNATIVE_RECOMMENDED' ? v.alternative : undefined,
            approval:
              decision === 'APPROVED'
                ? {
                    quantity: Number(v.quantity),
                    dose: Number(v.dose),
                    doseUnit: v.doseUnit,
                    schedule,
                    startDate: v.startDate,
                    durationDays: Number(v.durationDays),
                    reminderTime: v.reminderTime,
                    instructions: v.instructions,
                  }
                : undefined,
          },
          `Decision recorded: ${humanise(decision)}`,
        );
      }}
    >
      <div className="row">
        <strong>{treatment?.name}</strong>
        <Badge>{humanise(request.status)}</Badge>
        <span className="muted small">requested {fmtDateTime(request.createdAt)}</span>
      </div>
      {treatment && <RequestFlags flags={safetyFlags(store, request.memberId, treatment)} />}
      {request.reason && <p className="small">Member&apos;s reason: {request.reason}</p>}
      {treatment?.requiredLabs.length ? <p className="small muted">Pathway lists labs: {treatment.requiredLabs.join(', ')}</p> : null}
      <div className="form-grid">
        <label>
          Decision
          <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
            <option value="APPROVED">Approve</option>
            <option value="DECLINED">Decline</option>
            <option value="NEEDS_INFORMATION">Needs information</option>
            <option value="ALTERNATIVE_RECOMMENDED">Recommend alternative</option>
          </select>
        </label>
        <label>
          Review date
          <input name="reviewDate" type="date" min={addDays(today, 1)} defaultValue={addDays(today, treatment?.followUpDays ?? 28)} required />
        </label>
        {decision === 'ALTERNATIVE_RECOMMENDED' && (
          <label>
            Alternative pathway
            <select name="alternative" required>
              {alternatives.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {decision === 'APPROVED' && (
        <fieldset>
          <legend>Approved plan</legend>
          <div className="form-grid">
            <label>
              Packs approved
              <input name="quantity" type="number" min={1} max={12} defaultValue={1} required />
            </label>
            <label>
              Dose
              <input name="dose" type="number" step="any" min={0} defaultValue={1} required />
            </label>
            <label>
              Dose unit
              <input name="doseUnit" defaultValue="click" required />
            </label>
            <label>
              Start date
              <input name="startDate" type="date" min={today} defaultValue={today} required />
            </label>
            <label>
              Duration (days)
              <input name="durationDays" type="number" min={1} max={365} defaultValue={treatment?.supplyDays ?? 28} required />
            </label>
            <label>
              Default reminder time
              <input name="reminderTime" type="time" defaultValue="08:00" required />
            </label>
            <label>
              Frequency
              <select value={scheduleKind} onChange={(e) => setScheduleKind(e.target.value as Schedule['kind'])}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="WEEKDAYS">Selected weekdays</option>
                <option value="EVERY_N_DAYS">Every N days</option>
                <option value="CUSTOM">Custom dates</option>
              </select>
            </label>
            {scheduleKind === 'WEEKLY' && (
              <label>
                Weekday
                <select name="weekday" defaultValue={new Date().getDay()}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scheduleKind === 'EVERY_N_DAYS' && (
              <label>
                Interval (days)
                <input name="interval" type="number" min={2} max={60} defaultValue={3} required />
              </label>
            )}
            {scheduleKind === 'CUSTOM' && (
              <label>
                Dates (YYYY-MM-DD, comma separated)
                <input name="dates" required />
              </label>
            )}
          </div>
          {scheduleKind === 'WEEKDAYS' && (
            <div className="row">
              {WEEKDAYS.map((d, i) => (
                <label key={d} className="check">
                  <input type="checkbox" name={`wd${i}`} /> {d}
                </label>
              ))}
            </div>
          )}
          <label>
            Instructions for the member
            <textarea name="instructions" />
          </label>
        </fieldset>
      )}
      <label>
        Decision note (shown to the member)
        <textarea name="note" required />
      </label>
      {decision === 'APPROVED' && (
        <p className="small muted" style={{ margin: 0 }}>
          Approving releases the pen: the team is emailed the pen, quantity and dose to send. They never see the screening.
        </p>
      )}
      <div>
        <button type="submit" disabled={busy}>
          {decision === 'APPROVED' ? 'Approve and release the pen' : 'Record decision'}
        </button>
      </div>
    </form>
  );
}

/** One tap after every call, so everyone knows it happened and what comes next. */
function Calls({ memberId }: { memberId: string }) {
  const { workspace, run, busy } = useWorkspace();
  const calls = Object.values(workspace.store.phoneCalls)
    .filter((c) => c.memberId === memberId)
    .sort((a, b) => b.calledAt.localeCompare(a.calledAt));
  return (
    <Card title="Phone calls">
      <p className="muted small" style={{ marginTop: 0 }}>
        Tap after every call. Speaking to them clears any message they sent before the call. A pen request stays open until you record your decision below. Anything clinical goes in your notes.
      </p>
      <div className="row">
        <button type="button" disabled={busy} onClick={() => void run({ type: 'logCall', memberId, outcome: 'SPOKE' }, 'Call logged. Record your decision on any open request.')}>
          I spoke to them
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => void run({ type: 'logCall', memberId, outcome: 'NO_ANSWER' }, 'Missed call logged')}>
          No answer
        </button>
      </div>
      {calls.length > 0 && (
        <ul className="plain small" style={{ marginTop: '0.75rem' }}>
          {calls.slice(0, 5).map((c) => (
            <li key={c.id}>
              {c.outcome === 'SPOKE' ? 'Spoke to them' : 'No answer'} <span className="muted">{fmtDateTime(c.calledAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Plans({ memberId }: { memberId: string }) {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const today = localDate(new Date());
  const approvals = Object.values(store.approvedTreatments)
    .filter((a) => a.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card title="Plans and adherence">
      {!approvals.length && <Empty>No approvals.</Empty>}
      <ul className="plain small">
        {approvals.map((a) => {
          const regimen = Object.values(store.regimens).find((r) => r.approvalId === a.id);
          const events = Object.values(store.adherenceEvents).filter((e) => e.approvalId === a.id);
          const taken = events.filter((e) => e.action === 'TAKEN').length;
          const missed = events.filter((e) => e.action === 'MISSED').length;
          const release = Object.values(store.penReleases).find((p) => p.approvalId === a.id);
          return (
            <li key={a.id}>
              <strong>{store.treatments[a.treatmentId]?.name}</strong>{' '}
              <Badge tone={isApprovalCurrent(a, today) ? 'good' : undefined}>{isApprovalCurrent(a, today) ? 'Current' : humanise(a.status)}</Badge>
              <br />
              {regimen && `${regimen.dose} ${regimen.doseUnit}, ${describeSchedule(regimen.schedule)}. `}
              {a.startDate} to {a.expiresOn}. {a.remainingQuantity}/{a.approvedQuantity} packs left. Taken {taken}, missed {missed}.
              {release?.memberConfirmedAt && ` Has the pen since ${fmtDateTime(release.memberConfirmedAt)}.`}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function FollowUps({ memberId }: { memberId: string }) {
  const { workspace, run, busy } = useWorkspace();
  const followUps = Object.values(workspace.store.followUps)
    .filter((f) => f.memberId === memberId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const today = localDate(new Date());
  return (
    <Card title="Follow-ups">
      <ul className="plain small">
        {followUps.map((f) => (
          <li key={f.id}>
            <strong>{f.dueDate}</strong> {f.reason} <Badge>{humanise(f.status)}</Badge>
            {f.outcome && <div className="muted">Outcome: {f.outcome}</div>}
            {f.status === 'SCHEDULED' && (
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run({ type: 'followup', action: 'complete', memberId, followUpId: f.id, outcome: formValues(e.currentTarget).outcome }, 'Follow-up completed');
                }}
              >
                <input name="outcome" aria-label="Outcome" placeholder="Outcome" required style={{ flex: 1 }} />
                <button type="submit" className="secondary" disabled={busy}>
                  Complete
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form
        className="row"
        style={{ marginTop: '0.75rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = formValues(e.currentTarget);
          void run({ type: 'followup', action: 'schedule', memberId, dueDate: v.dueDate, reason: v.reason }, 'Follow-up scheduled');
        }}
      >
        <input name="dueDate" type="date" aria-label="Follow-up date" min={today} required style={{ width: 'auto' }} />
        <input name="reason" aria-label="Follow-up reason" placeholder="Reason" required style={{ flex: 1 }} />
        <button type="submit" disabled={busy}>
          Schedule
        </button>
      </form>
    </Card>
  );
}

function Nutrition({ memberId }: { memberId: string }) {
  const { workspace, run, busy } = useWorkspace();
  const current = workspace.store.nutritionProfiles[memberId];
  return (
    <Card title="Nutrition targets">
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          const v = formValues(e.currentTarget);
          const opt = (s: string) => (s ? Number(s) : undefined);
          void run(
            { type: 'nutrition', memberId, calorieTarget: Number(v.calorie), proteinTargetG: Number(v.protein), carbTargetG: opt(v.carb), fatTargetG: opt(v.fat), notes: v.notes },
            'Nutrition targets saved',
          );
        }}
      >
        <div className="form-grid">
          <label>
            Calories (kcal)
            <input name="calorie" type="number" min={800} max={6000} defaultValue={current?.calorieTarget} required />
          </label>
          <label>
            Protein (g)
            <input name="protein" type="number" min={10} max={400} defaultValue={current?.proteinTargetG} required />
          </label>
          <label>
            Carbohydrate (g)
            <input name="carb" type="number" min={0} max={900} defaultValue={current?.carbTargetG} />
          </label>
          <label>
            Fat (g)
            <input name="fat" type="number" min={0} max={400} defaultValue={current?.fatTargetG} />
          </label>
        </div>
        <label>
          Notes for the member
          <textarea name="notes" defaultValue={current?.notes} />
        </label>
        <div>
          <button type="submit" disabled={busy}>
            Save targets
          </button>
        </div>
      </form>
    </Card>
  );
}

function Notes({ memberId }: { memberId: string }) {
  const { workspace, run, busy } = useWorkspace();
  const notes = Object.values(workspace.store.clinicalNotes)
    .filter((n) => n.memberId === memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card title="Confidential clinical notes">
      <p className="muted small">Not visible to the member, operations, fulfilment or corporate users.</p>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          if (await run({ type: 'note', memberId, body: formValues(form).body }, 'Note saved')) form.reset();
        }}
      >
        <label>
          New note
          <textarea name="body" required />
        </label>
        <div>
          <button type="submit" disabled={busy}>
            Save note
          </button>
        </div>
      </form>
      <ul className="plain small" style={{ marginTop: '0.75rem' }}>
        {notes.map((n) => (
          <li key={n.id}>
            <span className="muted">{fmtDateTime(n.createdAt)}</span>
            <br />
            {n.body}
          </li>
        ))}
      </ul>
    </Card>
  );
}
