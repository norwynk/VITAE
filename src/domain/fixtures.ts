/**
 * Fictional demonstration data only. No real people, products, approvals,
 * registrations or prices. Every treatment here is an invented pathway that
 * starts unverified and not purchasable.
 */
import { type Actor, type Role, type Store, type Treatment, CONSENT_VERSION, addDays, emptyStore, localDate } from './model';

export const DEMO_USERS: Record<Role, { uid: string; name: string; email: string }> = {
  MEMBER: { uid: 'demo-member-new', name: 'Alex Demo', email: 'alex.demo@example.invalid' },
  CLINICIAN: { uid: 'demo-clinician', name: 'Dr Demo Clinician', email: 'clinician.demo@example.invalid' },
  OPERATIONS: { uid: 'demo-operations', name: 'Ops Demo', email: 'ops.demo@example.invalid' },
  SUPER_ADMIN: { uid: 'demo-admin', name: 'Admin Demo', email: 'admin.demo@example.invalid' },
  FULFILMENT: { uid: 'demo-fulfilment', name: 'Fulfilment Demo', email: 'fulfilment.demo@example.invalid' },
  CORPORATE_ADMIN: { uid: 'demo-corporate', name: 'Corporate Demo', email: 'corporate.demo@example.invalid' },
};

/** A second fictional member who is already part-way through care. */
export const DEMO_ESTABLISHED_MEMBER = { uid: 'demo-member-established', name: 'Sam Example' };

export function demoActor(role: Role): Actor {
  return { uid: DEMO_USERS[role].uid, role };
}

function treatment(partial: Partial<Treatment> & Pick<Treatment, 'id' | 'slug' | 'name' | 'summary' | 'inventorySku'>, at: string): Treatment {
  return {
    clinicalDescription: 'Fictional demonstration pathway. Not a real product or clinical protocol.',
    category: 'Demo',
    outcomes: [],
    requiresPrescription: true,
    requiresClinicianApproval: true,
    regulatoryStatus: 'UNCONFIRMED',
    regulatoryReference: '',
    active: true,
    public: true,
    purchasable: false,
    priceCents: 0,
    currency: 'ZAR',
    billing: 'ONE_OFF',
    supplyDays: 28,
    unitsPerPack: 1,
    administration: { device: 'PEN', route: 'Subcutaneous', instructions: 'Your clinician will explain how to use the pen.' },
    requiredAssessment: true,
    requiredLabs: [],
    followUpDays: 28,
    demoFictional: true,
    createdAt: at,
    updatedAt: at,
    ...partial,
  };
}

export function createFixtureStore(now: Date = new Date()): Store {
  const s = emptyStore();
  const at = now.toISOString();
  const today = localDate(now);

  for (const [role, u] of Object.entries(DEMO_USERS) as [Role, (typeof DEMO_USERS)[Role]][]) {
    s.users[u.uid] = { id: u.uid, email: u.email, displayName: u.name, role, createdAt: at, updatedAt: at };
  }
  const est = DEMO_ESTABLISHED_MEMBER;
  s.users[est.uid] = { id: est.uid, email: 'sam.example@example.invalid', displayName: est.name, role: 'MEMBER', createdAt: at, updatedAt: at };

  // The PRICK range. Names are the brand's product names; everything clinical
  // (claims, ingredients, dosing, registration) is deliberately absent until verified.
  const pen = (id: string, slug: string, name: string, category: string, sku: string) =>
    treatment(
      {
        id,
        slug,
        name,
        summary: 'Fictional demo product. Ingredient, dosing and regulatory information will be added once verified.',
        category,
        outcomes: ['Health screening first', 'Clinician-reviewed plan', 'Reminders and check-ins', 'Regular follow-up'],
        // Demo price only: no real pricing has been agreed.
        priceCents: 189_900,
        inventorySku: sku,
      },
      at,
    );
  s.treatments['trt-glow-up'] = pen('trt-glow-up', 'the-glow-up', 'The Glow Up', 'Look better', 'PRK-GLOW');
  s.treatments['trt-total-body-reset'] = pen('trt-total-body-reset', 'total-body-reset', 'Total Body Reset', 'Feel better', 'PRK-RESET');
  s.treatments['trt-deep-sleep-rebuild'] = pen('trt-deep-sleep-rebuild', 'deep-sleep-rebuild', 'Deep Sleep Rebuild', 'Sleep deeper', 'PRK-SLEEP');
  s.treatments['trt-sharp-mind'] = pen('trt-sharp-mind', 'sharp-mind', 'Sharp Mind', 'Think sharper', 'PRK-MIND');
  for (const t of Object.values(s.treatments)) {
    s.inventory[t.inventorySku] = { id: t.inventorySku, sku: t.inventorySku, treatmentId: t.id, onHand: 20, reserved: 0, updatedAt: at };
  }

  s.biomarkerDefinitions['bio-hba1c'] = { id: 'bio-hba1c', name: 'HbA1c', unit: '%', referenceLow: 4, referenceHigh: 5.6 };
  s.biomarkerDefinitions['bio-ldl'] = { id: 'bio-ldl', name: 'LDL cholesterol', unit: 'mmol/L', referenceHigh: 3 };

  // New member: account exists, onboarding not started.
  const nm = DEMO_USERS.MEMBER;
  s.members[nm.uid] = { id: nm.uid, memberId: nm.uid, firstName: 'Alex', lastName: 'Demo', email: nm.email, createdAt: at, updatedAt: at };
  s.operationalProfiles[nm.uid] = {
    id: nm.uid,
    memberId: nm.uid,
    displayName: 'Alex D.',
    onboardingStatus: 'NOT_STARTED',
    hasDeliveryAddress: false,
    openRequestCount: 0,
    consentWithdrawn: false,
    lastActivityAt: at,
  };

  // Established member with an active fictional plan.
  s.members[est.uid] = {
    id: est.uid,
    memberId: est.uid,
    firstName: 'Sam',
    lastName: 'Example',
    email: 'sam.example@example.invalid',
    dateOfBirth: '1988-04-12',
    identity: { type: 'PASSPORT', number: 'DEMO123456' },
    phone: '+27 00 000 0000',
    province: 'Western Cape',
    city: 'Cape Town',
    heightCm: 172,
    onboardedAt: at,
    createdAt: at,
    updatedAt: at,
  };
  s.operationalProfiles[est.uid] = {
    id: est.uid,
    memberId: est.uid,
    displayName: 'Sam E.',
    onboardingStatus: 'COMPLETE',
    province: 'Western Cape',
    hasDeliveryAddress: false,
    openRequestCount: 0,
    consentWithdrawn: false,
    lastActivityAt: at,
  };
  s.healthAssessments['asmt-demo-est'] = { id: 'asmt-demo-est', memberId: est.uid, kind: 'INTAKE', status: 'COMPLETE', testingInterest: true, completedAt: at };
  s.medicalHistories[est.uid] = {
    id: est.uid,
    memberId: est.uid,
    conditions: [],
    medications: 'None (fictional)',
    allergies: 'None (fictional)',
    pregnancyOrBreastfeeding: false,
    previousPeptideUse: false,
    notes: '',
    updatedAt: at,
  };
  s.lifestyleProfiles[est.uid] = { id: est.uid, memberId: est.uid, activityLevel: 'LIGHT', sleepHours: 6.5, smoking: false, alcoholUnitsPerWeek: 4, diet: 'Mixed', updatedAt: at };
  s.memberGoals['goal-demo-est'] = { id: 'goal-demo-est', memberId: est.uid, goals: ['Better energy'], motivation: 'Fictional demo goal', createdAt: at };
  s.measurements['meas-demo-est'] = { id: 'meas-demo-est', memberId: est.uid, kind: 'WEIGHT', value: 84, unit: 'kg', recordedAt: at, source: 'ONBOARDING' };
  for (const type of ['PRIVACY', 'TERMS', 'HEALTH_DATA', 'CLINICAL_SERVICE', 'COMMUNICATIONS'] as const) {
    s.consents[`${est.uid}_${type}`] = { id: `${est.uid}_${type}`, memberId: est.uid, type, granted: true, version: CONSENT_VERSION, recordedAt: at };
  }
  const start = addDays(today, -7);
  s.treatmentRequests['req-demo-est'] = {
    id: 'req-demo-est',
    memberId: est.uid,
    treatmentId: 'trt-total-body-reset',
    status: 'APPROVED',
    reason: 'Fictional demo request',
    createdAt: at,
    reviewedBy: DEMO_USERS.CLINICIAN.uid,
    reviewedAt: at,
    decisionNote: 'Fictional demo approval.',
  };
  s.approvedTreatments['apr-demo-est'] = {
    id: 'apr-demo-est',
    memberId: est.uid,
    treatmentId: 'trt-total-body-reset',
    requestId: 'req-demo-est',
    clinicianId: DEMO_USERS.CLINICIAN.uid,
    status: 'ACTIVE',
    approvedQuantity: 3,
    remainingQuantity: 3,
    startDate: start,
    expiresOn: addDays(start, 83),
    reviewDate: addDays(today, 21),
    createdAt: at,
  };
  s.regimens['rgm-demo-est'] = {
    id: 'rgm-demo-est',
    memberId: est.uid,
    approvalId: 'apr-demo-est',
    treatmentId: 'trt-total-body-reset',
    dose: 1,
    doseUnit: 'click',
    schedule: { kind: 'DAILY' },
    startDate: start,
    endDate: addDays(start, 83),
    instructions: 'Fictional demo instructions.',
    active: true,
  };
  s.reminders['rmd-demo-est'] = {
    id: 'rmd-demo-est',
    memberId: est.uid,
    regimenId: 'rgm-demo-est',
    approvalId: 'apr-demo-est',
    time: '08:00',
    active: true,
    createdAt: at,
    updatedAt: at,
  };
  s.followUps['fu-demo-est'] = {
    id: 'fu-demo-est',
    memberId: est.uid,
    approvalId: 'apr-demo-est',
    dueDate: addDays(today, 21),
    reason: 'Review of Total Body Reset',
    status: 'SCHEDULED',
    createdBy: DEMO_USERS.CLINICIAN.uid,
    createdAt: at,
  };

  for (const memberId of [nm.uid, est.uid]) {
    s.providerAssignments[`pa-${memberId}`] = {
      id: `pa-${memberId}`,
      memberId,
      clinicianId: DEMO_USERS.CLINICIAN.uid,
      active: true,
      createdAt: at,
    };
  }
  s.careTeams['team-demo'] = { id: 'team-demo', name: 'Demo care team', clinicianIds: [DEMO_USERS.CLINICIAN.uid] };
  s.corporateAccounts['corp-demo'] = { id: 'corp-demo', name: 'Example Employer (fictional)', adminIds: [DEMO_USERS.CORPORATE_ADMIN.uid], enrolledMembers: 2 };
  return s;
}
