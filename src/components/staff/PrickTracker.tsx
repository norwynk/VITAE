'use client';
import { type JourneyStage, journeyStage } from '@/domain/journey';
import type { MemberRecord, PenJourney } from '@/domain/model';
import { OVERDUE_HOURS, waitedLabel, workingHours } from '@/domain/waiting';
import { Badge, Card, Empty, fmtDateTime } from '../ui';
import { useWorkspace } from '../workspace-context';

/** Decisions from before phone calls could be logged shouldn't be flagged as having no call. */
const CALL_LOGGING_FROM = '2026-11-09T22:00:00.000Z';

interface Row {
  member: MemberRecord;
  journey: PenJourney;
  stage: JourneyStage;
}

export function trail({ requestedAt, missedCalls, spokenAt, decidedAt, sentAt, deliveredAt, memberConfirmedAt, followUpDoneAt }: PenJourney): string {
  return [
    `Asked ${fmtDateTime(requestedAt)}`,
    missedCalls ? `${missedCalls} missed call${missedCalls === 1 ? '' : 's'}` : '',
    spokenAt ? `Spoke ${fmtDateTime(spokenAt)}` : '',
    decidedAt ? `Decided ${fmtDateTime(decidedAt)}` : '',
    sentAt ? `Sent ${fmtDateTime(sentAt)}` : '',
    deliveredAt ? `Delivered ${fmtDateTime(deliveredAt)}` : '',
    memberConfirmedAt ? `Member has it ${fmtDateTime(memberConfirmedAt)}` : '',
    followUpDoneAt ? `Follow-up ${fmtDateTime(followUpDoneAt)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Everyone with something sitting with the doctor, longest wait first. */
export function WaitingOnDoctor() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const now = new Date();
  const waiting = Object.values(store.operationalProfiles)
    .filter((p) => p.waitingSince)
    .sort((a, b) => a.waitingSince!.localeCompare(b.waitingSince!));
  return (
    <Card title="Waiting on the clinician">
      {!waiting.length && <Empty>Nobody is waiting.</Empty>}
      <ul className="plain small stack" style={{ gap: '0.5rem' }}>
        {waiting.map((p) => {
          const hours = workingHours(p.waitingSince!, now);
          const m = store.members[p.memberId];
          return (
            <li key={p.id}>
              <strong>{m ? `${m.firstName} ${m.lastName}`.trim() || m.email : p.displayName}</strong>: waiting {waitedLabel(hours)} {hours >= OVERDUE_HOURS && <Badge tone="alert">Overdue</Badge>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Every pen, the step it has reached and whose move it is. Steps and dates only, never what was said or decided. */
export function PrickTracker() {
  const { workspace } = useWorkspace();
  const { store } = workspace;
  const now = new Date();
  const rows: Row[] = Object.values(store.members).flatMap((member) => (member.penJourneys ?? []).map((journey) => ({ member, journey, stage: journeyStage(journey, now) })));
  const open = rows.filter((r) => r.stage.open).sort((a, b) => Number(b.stage.late) - Number(a.stage.late) || a.journey.requestedAt.localeCompare(b.journey.requestedAt));
  const closed = rows.filter((r) => !r.stage.open).sort((a, b) => b.journey.requestedAt.localeCompare(a.journey.requestedAt));
  const late = open.filter((r) => r.stage.late).length;

  const table = (list: Row[]) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Who</th>
            <th>Pen</th>
            <th>Where it&apos;s at</th>
            <th>Whose move</th>
            <th>So far</th>
          </tr>
        </thead>
        <tbody>
          {list.map(({ member: m, journey: j, stage }) => (
            <tr key={j.requestId}>
              <td>{`${m.firstName} ${m.lastName}`.trim() || m.email}</td>
              <td>{store.treatments[j.treatmentId]?.name ?? 'A pen no longer listed'}</td>
              <td>
                {stage.label} {stage.late && <Badge tone="alert">Late</Badge>}{' '}
                {j.decidedAt && !j.spokenAt && j.decidedAt >= CALL_LOGGING_FROM && <Badge tone="alert">No call logged</Badge>}
              </td>
              <td>{stage.who ?? <span className="muted">Nobody</span>}</td>
              <td className="small muted">{trail(j)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card title={`The Prick Tracker${open.length ? ` (${open.length} in play${late ? `, ${late} late` : ''})` : ''}`}>
      <p className="muted small" style={{ marginTop: 0 }}>
        Every pen, the step it has reached and whose move it is. Steps and dates only: what was said or decided stays with the clinician.
      </p>
      {open.length ? table(open) : <Empty>Nothing in play.</Empty>}
      {closed.length > 0 && (
        <details style={{ marginTop: 'var(--space-3)' }}>
          <summary className="small">Finished ({closed.length})</summary>
          {table(closed)}
        </details>
      )}
    </Card>
  );
}
