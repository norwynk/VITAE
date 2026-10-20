/**
 * Trusted staff administration (Admin SDK). Run by an operator with
 * credentials, never from the app:
 *
 *   npm run staff -- set-role <email> <ROLE>
 *   npm run staff -- assign <clinicianEmail> <memberEmail>
 *   npm run staff -- unassign <clinicianEmail> <memberEmail>
 *   npm run staff -- invite <email> <ROLE> [name]          create a staff account; prints a set-your-password link
 *   npm run staff -- default-clinician <clinicianEmail>   new members (and any unassigned ones) go to them
 *   npm run staff -- enable-totp                          let staff use an authenticator app as their second step
 *   npm run staff -- catalogue                            add missing PRICK pens; refresh their product facts
 *
 * Uses GOOGLE_APPLICATION_CREDENTIALS (or emulator env vars). Role changes
 * revoke refresh tokens so the user must sign in again to pick up the claim.
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createFixtureStore } from '../src/domain/fixtures';
import { ROLES, type ProviderAssignment, type Role } from '../src/domain/model';

// The operator's key, kept outside the repo, unless credentials or an emulator are set explicitly.
const KEY_FILE = join(homedir(), 'Documents', 'prick-admin-key.json');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIRESTORE_EMULATOR_HOST && existsSync(KEY_FILE)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY_FILE;
}

initializeApp();
const auth = getAuth();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
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

/** Creates a staff account and prints a one-time link where they choose their own password. */
async function invite(email: string, role: string, name: string | undefined) {
  if (!(ROLES as readonly string[]).includes(role) || role === 'MEMBER') throw new Error(`Role must be one of ${ROLES.filter((r) => r !== 'MEMBER').join(', ')}`);
  const user = await auth.getUserByEmail(email).catch(() =>
    auth.createUser({ email, emailVerified: true, password: randomUUID() + randomUUID(), displayName: name }),
  );
  await setRole(email, role);
  if (name) await db.doc(`users/${user.uid}`).set({ displayName: name }, { merge: true });
  const link = await auth.generatePasswordResetLink(email, process.env.SITE_URL ? { url: `${process.env.SITE_URL}/app` } : undefined);
  console.log(`\nSend this to ${email}. It lets them choose a password, then sign in at /app and set up their authenticator app:\n\n${link}\n`);
}

async function defaultClinician(clinicianEmail: string) {
  const clinician = await auth.getUserByEmail(clinicianEmail);
  if (clinician.customClaims?.role !== 'CLINICIAN') throw new Error(`${clinicianEmail} is not a clinician. Run set-role first.`);
  const now = new Date().toISOString();
  await db.doc('config/care').set({ defaultClinicianId: clinician.uid, updatedAt: now }, { merge: true });
  await audit('default_clinician_set', [clinician.uid]);
  // Anyone who signed up before this has nobody to review them yet.
  const [members, active] = await Promise.all([
    db.collection('members').get(),
    db.collection('providerAssignments').where('active', '==', true).get(),
  ]);
  const covered = new Set(active.docs.map((d) => d.get('memberId') as string));
  let assigned = 0;
  for (const m of members.docs) {
    if (covered.has(m.id)) continue;
    const a: ProviderAssignment = { id: `pa_${m.id}_${clinician.uid}`, memberId: m.id, clinicianId: clinician.uid, active: true, createdAt: now };
    await db.doc(`providerAssignments/${a.id}`).set(a);
    await audit('clinician_assigned', [a.id], m.id);
    assigned++;
  }
  console.log(`New members now go to ${clinicianEmail}. Assigned ${assigned} existing member(s) who had no clinician.`);
}

async function enableTotp() {
  await auth.projectConfigManager().updateProjectConfig({
    multiFactorConfig: { state: 'ENABLED', factorIds: [], providerConfigs: [{ state: 'ENABLED', totpProviderConfig: { adjacentIntervals: 5 } }] },
  });
  await audit('totp_enabled', []);
  console.log('Authenticator-app sign-in is on. Staff set it up the first time they sign in.');
}

/** Adds missing pens (no prices, nothing purchasable) and refreshes sheet-only product facts. Staff-edited fields are left alone. */
async function catalogue() {
  const range = createFixtureStore(new Date());
  let added = 0;
  for (const t of Object.values(range.treatments)) {
    const ref = db.doc(`treatments/${t.id}`);
    const existing = await ref.get();
    if (existing.exists) {
      // Product facts come only from the character sheet (staff can't edit them): keep them current.
      const facts = { productTruth: t.productTruth, clinicalTruth: t.clinicalTruth };
      if (JSON.stringify(facts) !== JSON.stringify({ productTruth: existing.get('productTruth'), clinicalTruth: existing.get('clinicalTruth') })) {
        await ref.set({ ...facts, updatedAt: new Date().toISOString() }, { merge: true });
        await audit('catalogue_facts_refreshed', [t.id]);
        console.log(`Updated product facts for ${t.name}`);
      }
      continue;
    }
    await ref.set({ ...t, demoFictional: false, priceCents: 0, purchasable: false });
    const stock = range.inventory[t.inventorySku];
    if (stock) await db.doc(`inventory/${stock.id}`).set({ ...stock, onHand: 0 }, { merge: true });
    await audit('catalogue_seeded', [t.id]);
    console.log(`Added ${t.name}`);
    added++;
  }
  console.log(`${added} pen(s) added; ${Object.keys(range.treatments).length - added} already there.`);
}

const [cmd, a, b] = process.argv.slice(2);
const run =
  cmd === 'set-role' && a && b
    ? setRole(a, b)
    : (cmd === 'assign' || cmd === 'unassign') && a && b
      ? assignment(a, b, cmd === 'assign')
      : cmd === 'invite' && a && b
        ? invite(a, b, process.argv.slice(5).join(' ') || undefined)
      : cmd === 'default-clinician' && a
        ? defaultClinician(a)
        : cmd === 'enable-totp'
          ? enableTotp()
          : cmd === 'catalogue'
            ? catalogue()
            : Promise.reject(
                new Error(
                  'Usage: set-role <email> <ROLE> | assign <clinicianEmail> <memberEmail> | unassign <clinicianEmail> <memberEmail> | invite <email> <ROLE> [name] | default-clinician <clinicianEmail> | enable-totp | catalogue',
                ),
              );

run.catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
