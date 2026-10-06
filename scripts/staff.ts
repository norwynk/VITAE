/**
 * Trusted staff administration (Admin SDK). Run by an operator with
 * credentials, never from the app:
 *
 *   npm run staff -- set-role <email> <ROLE>
 *   npm run staff -- assign <clinicianEmail> <memberEmail>
 *   npm run staff -- unassign <clinicianEmail> <memberEmail>
 *
 * Uses GOOGLE_APPLICATION_CREDENTIALS (or emulator env vars). Role changes
 * revoke refresh tokens so the user must sign in again to pick up the claim.
 */
import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { ROLES, type Role } from '../src/domain/model';

initializeApp();
const auth = getAuth();
const db = getFirestore();
const OPERATOR = process.env.STAFF_OPERATOR ?? 'admin-cli';

async function audit(action: string, targets: string[], memberId?: string) {
  const id = `aud_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  await db.doc(`auditEvents/${id}`).set({
    id,
    actorId: OPERATOR,
    actorRole: 'SUPER_ADMIN',
    action,
    targets,
    ...(memberId ? { memberId } : {}),
    at: new Date().toISOString(),
  });
}

async function setRole(email: string, role: string) {
  if (!(ROLES as readonly string[]).includes(role)) throw new Error(`Role must be one of ${ROLES.join(', ')}`);
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: role as Role });
  await auth.revokeRefreshTokens(user.uid);
  const now = new Date().toISOString();
  await db.doc(`users/${user.uid}`).set({ id: user.uid, email, role, updatedAt: now }, { merge: true });
  await audit('staff_role_set', [user.uid]);
  console.log(`Set ${email} to ${role}. Their sessions were revoked; they must sign in again.`);
}

async function assignment(clinicianEmail: string, memberEmail: string, active: boolean) {
  const clinician = await auth.getUserByEmail(clinicianEmail);
  const member = await auth.getUserByEmail(memberEmail);
  if (clinician.customClaims?.role !== 'CLINICIAN') throw new Error(`${clinicianEmail} is not a clinician`);
  if (member.customClaims?.role !== 'MEMBER') throw new Error(`${memberEmail} is not a member`);
  const id = `pa_${member.uid}_${clinician.uid}`;
  await db.doc(`providerAssignments/${id}`).set(
    { id, memberId: member.uid, clinicianId: clinician.uid, active, createdAt: new Date().toISOString() },
    { merge: true },
  );
  await audit(active ? 'clinician_assigned' : 'clinician_unassigned', [id], member.uid);
  console.log(`${active ? 'Assigned' : 'Unassigned'} ${clinicianEmail} ${active ? 'to' : 'from'} ${memberEmail}.`);
}

const [cmd, a, b] = process.argv.slice(2);
const run =
  cmd === 'set-role' && a && b
    ? setRole(a, b)
    : (cmd === 'assign' || cmd === 'unassign') && a && b
      ? assignment(a, b, cmd === 'assign')
      : Promise.reject(new Error('Usage: set-role <email> <ROLE> | assign <clinicianEmail> <memberEmail> | unassign <clinicianEmail> <memberEmail>'));

run.catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
