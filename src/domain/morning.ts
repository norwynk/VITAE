/**
 * The admin's morning view: what needs doing and how the business stands.
 * Built only from what the admin may see, so nothing medical can reach it.
 */
import { CUSTOMER_STAGES, type CustomerStage, DELIVERY_HOURS, SEND_HOURS, customerStage, journeyStage } from './journey';
import type { Store } from './model';
import { TEAM_REPLY_HOURS, waitedLabel, waitingOnTeam, workingHours } from './waiting';

const WEEK = 7 * 86_400_000;

export interface BriefAction {
  key: string;
  text: string;
  who: 'Team' | 'Doctor';
  late: boolean;
  tab: 'Pens' | 'Messages';
}

export interface MorningBrief {
  actions: BriefAction[];
  withDoctor: number;
  toSend: number;
  outForDelivery: number;
  deliveredThisWeek: number;
  newThisWeek: number;
  stages: Record<CustomerStage, number>;
}

export function morningBrief(store: Store, now: Date): MorningBrief {
  const weekAgo = new Date(now.getTime() - WEEK).toISOString();
  const members = Object.values(store.members);
  const releases = Object.values(store.penReleases);
  const toSend = releases.filter((r) => r.status === 'TO_SEND');
  const out = releases.filter((r) => r.status === 'SENT' && !r.deliveredAt);
  const name = (memberId: string) => {
    const m = store.members[memberId];
    return (m && `${m.firstName} ${m.lastName}`.trim()) || store.operationalProfiles[memberId]?.displayName || 'A member';
  };

  const actions: BriefAction[] = [
    ...toSend.map((r): BriefAction => ({
      key: `send_${r.id}`,
      text: `Send ${r.treatmentName} to ${r.memberName}${r.deliveryAddress ? '' : '. No delivery address yet, so phone them first'}`,
      who: 'Team',
      late: workingHours(r.approvedAt, now) >= SEND_HOURS,
      tab: 'Pens',
    })),
    ...out
      .filter((r) => r.sentAt && workingHours(r.sentAt, now) >= DELIVERY_HOURS)
      .map((r): BriefAction => ({
        key: `chase_${r.id}`,
        text: `Chase delivery of ${r.treatmentName} to ${r.memberName}${r.courierReference ? ` (${r.courierReference})` : ''}`,
        who: 'Team',
        late: true,
        tab: 'Pens',
      })),
    ...waitingOnTeam(store).map((i): BriefAction => ({
      key: i.key,
      text: `Reply to ${name(i.memberId)} about their delivery, waiting ${waitedLabel(workingHours(i.since, now))}`,
      who: 'Team',
      late: workingHours(i.since, now) >= TEAM_REPLY_HOURS,
      tab: 'Messages',
    })),
    ...members.flatMap((m) =>
      (m.penJourneys ?? []).flatMap((j) => {
        const stage = journeyStage(j, now);
        if (!stage.late || stage.who !== 'Doctor') return [];
        const pen = store.treatments[j.treatmentId]?.name ?? 'a pen';
        const text = j.decidedAt ? `${name(m.memberId)}: ${stage.label.toLowerCase()} (${pen})` : `${name(m.memberId)} has waited ${waitedLabel(workingHours(j.requestedAt, now))} for the doctor (${pen})`;
        return [{ key: `doc_${j.requestId}`, text, who: 'Doctor' as const, late: true, tab: 'Pens' as const }];
      }),
    ),
  ].sort((a, b) => Number(b.late) - Number(a.late) || b.who.localeCompare(a.who));

  const stages = Object.fromEntries(CUSTOMER_STAGES.map((s) => [s, 0])) as Record<CustomerStage, number>;
  for (const m of members) stages[customerStage(m)] += 1;

  return {
    actions,
    withDoctor: members.reduce((n, m) => n + (m.penJourneys ?? []).filter((j) => !j.decidedAt).length, 0),
    toSend: toSend.length,
    outForDelivery: out.length,
    deliveredThisWeek: releases.filter((r) => r.deliveredAt && r.deliveredAt >= weekAgo).length,
    newThisWeek: members.filter((m) => m.createdAt >= weekAgo).length,
    stages,
  };
}
