/**
 * Staff emails. They say that something happened and link to the secure
 * workspace; screening answers never go in an email.
 *
 * The sending account is the MAIL_LOGIN secret: "address app-password"
 * (a Gmail address and its Google app password). "none" switches emails off.
 */
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { createTransport } from 'nodemailer';
import type { Command } from '../../src/domain/commands';
import { isRepeatRoute } from '../../src/domain/intake';
import type { HealthAssessment, MemberRecord, PenRelease, Role } from '../../src/domain/model';

export const MAIL_LOGIN = defineSecret('MAIL_LOGIN');
// The public site address (functions/.env SITE_URL); the App Hosting address until the domain is linked.
const SITE = (process.env.SITE_URL || 'https://prick-site--prick-c3c43.europe-west4.hosted.app').replace(/\/+$/, '');

async function send(to: string[], subject: string, text: string) {
  const login = MAIL_LOGIN.value().trim();
  const recipients = [...new Set(to.filter(Boolean))];
  if (!login || login === 'none' || !recipients.length) {
    logger.info('Email skipped', { subject, reason: !recipients.length ? 'no recipients' : 'no sending account' });
    return;
  }
  const space = login.indexOf(' ');
  const user = login.slice(0, space);
  const pass = login.slice(space + 1).replace(/\s/g, '');
  const transport = createTransport({ service: 'gmail', auth: { user, pass } });
  await transport.sendMail({ from: `PRICK <${user}>`, to: recipients, subject, text });
}

async function emailsFor(db: Firestore, roles: Role[]): Promise<string[]> {
  const snap = await db.collection('users').where('role', 'in', roles).get();
  return snap.docs.map((d) => d.get('email') as string).filter(Boolean);
}

async function clinicianEmailsFor(db: Firestore, memberId: string): Promise<string[]> {
  const assignments = await db.collection('providerAssignments').where('memberId', '==', memberId).where('active', '==', true).get();
  const users = await Promise.all(assignments.docs.map((a) => db.doc(`users/${a.get('clinicianId')}`).get()));
  return users.map((u) => u.get('email') as string).filter(Boolean);
}

/**
 * The admin's email check: same sending account and route as the real
 * alerts, to the default clinician and the admins, clearly marked as a
 * test. Throws with the reason if it can't send.
 */
export async function sendTestEmail(db: Firestore, requestedBy: string): Promise<{ from: string; to: string[] }> {
  const login = MAIL_LOGIN.value().trim();
  if (!login || login === 'none') throw new Error('No sending account is set up yet (the MAIL_LOGIN secret).');
  const clinicianId = (await db.doc('config/care').get()).get('defaultClinicianId');
  const clinician = clinicianId ? ((await db.doc(`users/${clinicianId}`).get()).get('email') as string | undefined) : undefined;
  const to = [...new Set([clinician, ...(await emailsFor(db, ['SUPER_ADMIN']))].filter((e): e is string => Boolean(e)))];
  if (!to.length) throw new Error('No staff email addresses were found.');
  await send(
    to,
    '[TEST] PRICK email check: please ignore',
    [
      'This is a test. Please ignore it.',
      '',
      `${requestedBy} sent this from the admin page to check that PRICK alerts reach your inbox.`,
      '',
      'If you can read this, emails are working. Real alerts look like "New screening: [name]" and never contain health details.',
      '',
      `${SITE}/app`,
    ].join('\n'),
  );
  return { from: login.slice(0, login.indexOf(' ')), to };
}

/** After a command succeeds: tell the people who need to act. Never throws. */
export async function notifyTeam(db: Firestore, command: Command, memberId: string | undefined, resultId: string | undefined) {
  try {
    if (command.type === 'onboard' && memberId) {
      const member = (await db.doc(`members/${memberId}`).get()).data() as MemberRecord | undefined;
      const name = member ? `${member.firstName} ${member.lastName}`.trim() : 'A new member';
      const assessment = resultId ? ((await db.doc(`healthAssessments/${resultId}`).get()).data() as HealthAssessment | undefined) : undefined;
      const flagged = assessment?.penAnswers?.filter((a) => a.flagged).length ?? 0;
      const repeat = assessment?.intake ? isRepeatRoute(assessment.intake.answers) : false;
      const what = repeat ? 'an existing script to verify' : 'a completed screening';
      await send(
        await clinicianEmailsFor(db, memberId),
        repeat ? `Script to verify: ${name}` : `New screening: ${name}`,
        [
          `${name} has sent you ${what}.`,
          ...(flagged ? [`${flagged} answer${flagged === 1 ? '' : 's'} flagged for you to look at.`] : []),
          '',
          `Open your clinician workspace to review it: ${SITE}/app`,
          '',
          'For privacy, health details are only in the workspace, never in email.',
        ].join('\n'),
      );
      await send(
        await emailsFor(db, ['SUPER_ADMIN']),
        `${repeat ? 'Script' : 'Screening'} sent to the clinician: ${name}`,
        `${name} has sent ${what} to their clinician.\n\nYou'll get another email if a pen is approved.\n\n${SITE}/app`,
      );
    }

    if (command.type === 'review' && command.decision === 'APPROVED' && resultId) {
      const snap = await db.collection('penReleases').where('approvalId', '==', resultId).limit(1).get();
      const r = snap.docs[0]?.data() as PenRelease | undefined;
      if (!r) return;
      const a = r.deliveryAddress;
      await send(
        await emailsFor(db, ['SUPER_ADMIN', 'OPERATIONS']),
        `Approved: ${r.treatmentName} for ${r.memberName}`,
        [
          `${r.approvedByName} approved ${r.treatmentName} for ${r.memberName}.`,
          '',
          `Quantity: ${r.quantity} pen${r.quantity === 1 ? '' : 's'}`,
          `Dose: ${r.dose}`,
          ...(r.instructions ? [`Instructions: ${r.instructions}`] : []),
          `Start date: ${r.startDate}`,
          '',
          `Phone: ${r.phone ?? 'not given'}`,
          `Email: ${r.email ?? 'not given'}`,
          a
            ? `Delivery: ${a.recipient}, ${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.suburb}, ${a.city}, ${a.province}, ${a.postalCode} (${a.phone})`
            : 'Delivery address: not saved yet. Contact them to arrange it.',
          '',
          `When it's on its way, mark it as sent in the admin workspace: ${SITE}/app`,
        ].join('\n'),
      );
    }
  } catch (e) {
    logger.warn('Team email failed', e);
  }
}
