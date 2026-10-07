/**
 * Command contract and domain transitions.
 *
 * Every state change in demo and Firebase modes goes through `applyCommand()`:
 * parse with `commandSchema`, check role and business rules against a cloned
 * store, update related records and append an audit event. The UI never
 * duplicates these rules; hiding a button is not a control.
 */
import { z } from 'zod';
import {
  type Actor,
  type Address,
  type ApprovedTreatment,
  type AuditEvent,
  type ConsentType,
  type MessageThread,
  type NotificationRecord,
  type OrderStatus,
  type Role,
  type Store,
  type Treatment,
  CONSENT_VERSION,
  MEASUREMENT_UNITS,
  OPERATIONS_TOPICS,
  OPTIONAL_CONSENTS,
  PENDING_REQUEST_STATUSES,
  REGULATORY_STATUSES,
  REQUIRED_CONSENTS,
  SA_PROVINCES,
  THREAD_TOPICS,
  activeAssignedMemberIds,
  addDays,
  ageOn,
  isApprovalCurrent,
  isScheduledOn,
  isValidDate,
  localDate,
} from './model';

// ---------------------------------------------------------------------------
// Errors and context
// ---------------------------------------------------------------------------

export type DomainErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'CONFLICT'
  | 'PRECONDITION';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export type DataMode = 'demo' | 'live';

export interface CommandContext {
  now: Date;
  mode: DataMode;
  /** Produces a new unique id. Injected so tests are deterministic. */
  newId: (prefix: string) => string;
}

export function randomIdFactory(): (prefix: string) => string {
  return (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const dateString = z.string().refine(isValidDate, 'Expected a valid YYYY-MM-DD date');
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM');
const id = z.string().trim().min(1).max(128);

export const addressSchema = z.object({
  recipient: requiredText(120),
  line1: requiredText(160),
  line2: text(160).optional(),
  suburb: requiredText(80),
  city: requiredText(80),
  province: z.enum(SA_PROVINCES),
  postalCode: z.string().regex(/^\d{4}$/, 'South African postal codes have 4 digits'),
  phone: z.string().regex(/^\+?\d[\d ]{8,15}$/, 'Enter a valid phone number'),
});

export const scheduleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('DAILY') }),
  z.object({ kind: z.literal('WEEKLY'), weekday: z.number().int().min(0).max(6) }),
  z.object({
    kind: z.literal('WEEKDAYS'),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  }),
  z.object({ kind: z.literal('EVERY_N_DAYS'), interval: z.number().int().min(2).max(60) }),
  z.object({ kind: z.literal('CUSTOM'), dates: z.array(dateString).min(1).max(120) }),
]);

const consentFlags = z.object({
  privacy: z.boolean(),
  terms: z.boolean(),
  healthData: z.boolean(),
  clinicalService: z.boolean(),
  communications: z.boolean().default(false),
  marketing: z.boolean().default(false),
});

const onboardSchema = z.object({
  type: z.literal('onboard'),
  profile: z.object({
    firstName: requiredText(80),
    lastName: requiredText(80),
    dateOfBirth: dateString,
    identity: z.discriminatedUnion('type', [
      z.object({ type: z.literal('SA_ID'), number: z.string().regex(/^\d{13}$/, 'SA ID numbers have 13 digits') }),
      z.object({ type: z.literal('PASSPORT'), number: z.string().regex(/^[A-Za-z0-9]{6,20}$/) }),
    ]),
    phone: z.string().regex(/^\+?\d[\d ]{8,15}$/, 'Enter a valid phone number'),
    province: z.enum(SA_PROVINCES),
    city: requiredText(80),
  }),
  body: z.object({
    heightCm: z.number().min(100).max(250),
    weightKg: z.number().min(30).max(350),
  }),
  goals: z.object({
    goals: z.array(requiredText(80)).min(1).max(8),
    motivation: text(1000),
  }),
  health: z.object({
    conditions: z.array(requiredText(120)).max(30),
    medications: text(2000),
    allergies: text(1000),
    pregnancyOrBreastfeeding: z.boolean(),
    previousPeptideUse: z.boolean(),
    notes: text(2000),
  }),
  lifestyle: z.object({
    activityLevel: z.enum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE']),
    sleepHours: z.number().min(0).max(24),
    smoking: z.boolean(),
    alcoholUnitsPerWeek: z.number().int().min(0).max(200),
    diet: text(500),
  }),
  testingInterest: z.boolean(),
  consents: consentFlags,
});

const approvalSchema = z.object({
  quantity: z.number().int().min(1).max(12),
  dose: z.number().positive().max(10_000),
  doseUnit: requiredText(20),
  schedule: scheduleSchema,
  startDate: dateString,
  durationDays: z.number().int().min(1).max(365),
  reminderTime: timeString,
  instructions: text(1000),
});

const reviewSchema = z.object({
  type: z.literal('review'),
  requestId: id,
  memberId: id,
  decision: z.enum(['APPROVED', 'DECLINED', 'NEEDS_INFORMATION', 'ALTERNATIVE_RECOMMENDED']),
  note: requiredText(2000),
  reviewDate: dateString,
  approval: approvalSchema.optional(),
  alternativeTreatmentId: id.optional(),
});

const measurementSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('WEIGHT'), unit: z.literal('kg'), value: z.number().min(20).max(400) }),
  z.object({ kind: z.literal('SLEEP'), unit: z.literal('hours'), value: z.number().min(0).max(24) }),
  z.object({
    kind: z.literal('BLOOD_PRESSURE'),
    unit: z.literal('mmHg'),
    value: z.number().int().min(60).max(260),
    value2: z.number().int().min(30).max(160),
  }),
  z.object({ kind: z.literal('BODY_COMPOSITION'), unit: z.literal('percent'), value: z.number().min(2).max(75) }),
]);

const treatmentEditable = z.object({
  name: requiredText(120),
  summary: requiredText(400),
  clinicalDescription: text(4000),
  category: requiredText(60),
  outcomes: z.array(requiredText(160)).max(10),
  requiresPrescription: z.boolean(),
  requiresClinicianApproval: z.boolean(),
  regulatoryStatus: z.enum(REGULATORY_STATUSES),
  regulatoryReference: text(120),
  active: z.boolean(),
  public: z.boolean(),
  purchasable: z.boolean(),
  priceCents: z.number().int().min(0).max(10_000_000),
  billing: z.enum(['ONE_OFF', 'MONTHLY']),
  supplyDays: z.number().int().min(1).max(365),
  unitsPerPack: z.number().int().min(1).max(100),
  administration: z.object({
    device: z.enum(['PEN', 'OTHER']),
    route: requiredText(60),
    instructions: text(2000),
  }),
  requiredAssessment: z.boolean(),
  requiredLabs: z.array(requiredText(80)).max(20),
  followUpDays: z.number().int().min(1).max(365),
  productTruth: z
    .object({
      activeIngredient: text(200),
      supplierName: text(120),
      supplierStrength: text(80),
      productClass: text(300),
      mechanism: text(2000),
      evidence: text(2000),
      contentStatus: text(1000),
    })
    .partial(),
  clinicalTruth: z
    .object({
      approvalStatus: text(2000),
      reviewNote: text(2000),
      approvedIndication: text(2000),
      eligibility: text(2000),
      route: text(300),
      dosing: text(2000),
      warnings: text(4000),
      contraindications: text(4000),
    })
    .partial(),
});

export const commandSchema = z.discriminatedUnion('type', [
  onboardSchema,
  z.object({ type: z.literal('request'), treatmentId: id, reason: text(1000).default('') }),
  reviewSchema,
  z.object({
    type: z.literal('adherence'),
    approvalId: id,
    dueDate: dateString,
    action: z.enum(['TAKEN', 'MISSED', 'SNOOZED']),
    snoozeMinutes: z.number().int().optional(),
  }),
  z.object({ type: z.literal('notificationTime'), reminderId: id, time: timeString }),
  z.object({ type: z.literal('measurement'), measurement: measurementSchema }),
  z.object({
    type: z.literal('checkout'),
    treatmentId: id,
    quantity: z.number().int().min(1).max(6),
    address: addressSchema.optional(),
  }),
  z.object({ type: z.literal('deliveryAddress'), address: addressSchema }),
  z.object({
    type: z.literal('message'),
    threadId: id.optional(),
    memberId: id.optional(),
    topic: z.enum(THREAD_TOPICS).optional(),
    subject: text(120).optional(),
    body: requiredText(4000),
  }),
  z.object({ type: z.literal('note'), memberId: id, body: requiredText(8000) }),
  z.object({
    type: z.literal('nutrition'),
    memberId: id,
    calorieTarget: z.number().int().min(800).max(6000),
    proteinTargetG: z.number().int().min(10).max(400),
    carbTargetG: z.number().int().min(0).max(900).optional(),
    fatTargetG: z.number().int().min(0).max(400).optional(),
    notes: text(2000),
  }),
  z.object({
    type: z.literal('checkin'),
    mood: z.number().int().min(1).max(5),
    energy: z.number().int().min(1).max(5),
    sideEffects: z.boolean(),
    needSupport: z.boolean(),
    notes: text(2000),
  }),
  z.discriminatedUnion('action', [
    z.object({
      type: z.literal('followup'),
      action: z.literal('schedule'),
      memberId: id,
      dueDate: dateString,
      reason: requiredText(500),
      approvalId: id.optional(),
    }),
    z.object({
      type: z.literal('followup'),
      action: z.literal('complete'),
      memberId: id,
      followUpId: id,
      outcome: requiredText(2000),
    }),
  ]),
  z.object({ type: z.literal('catalogue'), treatmentId: id, changes: treatmentEditable.partial() }),
  z.object({
    type: z.literal('catalogueCreate'),
    slug: z.string().regex(/^[a-z0-9-]{3,60}$/, 'Use lowercase letters, numbers and hyphens'),
    name: requiredText(120),
    summary: requiredText(400),
    category: requiredText(60),
    inventorySku: z.string().regex(/^[A-Z0-9-]{3,40}$/, 'Use uppercase letters, numbers and hyphens'),
  }),
  z.object({ type: z.literal('stockAdjust'), sku: id, onHand: z.number().int().min(0).max(100_000) }),
  z.object({
    type: z.literal('withdrawConsent'),
    consentType: z.enum([...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS]),
    reason: text(1000).default(''),
  }),
  z.object({
    type: z.literal('orderStatus'),
    orderId: id,
    memberId: id,
    status: z.enum(['PAID', 'PREPARING', 'DISPENSED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    courierReference: text(80).optional(),
  }),
  z.object({ type: z.literal('readNotification'), notificationId: id }),
]);

export type Command = z.infer<typeof commandSchema>;
export type CommandInput = z.input<typeof commandSchema>;
export type CommandType = Command['type'];

export function parseCommand(input: unknown): Command {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new DomainError('INVALID', `${where}${issue?.message ?? 'Invalid command'}`);
  }
  return parsed.data;
}

// ---------------------------------------------------------------------------
// Role policy
// ---------------------------------------------------------------------------

const COMMAND_ROLES: Record<CommandType, readonly Role[]> = {
  onboard: ['MEMBER'],
  request: ['MEMBER'],
  review: ['CLINICIAN'],
  adherence: ['MEMBER'],
  notificationTime: ['MEMBER'],
  measurement: ['MEMBER'],
  checkout: ['MEMBER'],
  deliveryAddress: ['MEMBER'],
  message: ['MEMBER', 'CLINICIAN', 'OPERATIONS'],
  note: ['CLINICIAN'],
  nutrition: ['CLINICIAN'],
  checkin: ['MEMBER'],
  followup: ['CLINICIAN', 'OPERATIONS'],
  catalogue: ['SUPER_ADMIN'],
  catalogueCreate: ['SUPER_ADMIN'],
  stockAdjust: ['SUPER_ADMIN', 'OPERATIONS'],
  withdrawConsent: ['MEMBER'],
  orderStatus: ['OPERATIONS', 'FULFILMENT'],
  readNotification: ['MEMBER'],
};

export function allowedRoles(type: CommandType): readonly Role[] {
  return COMMAND_ROLES[type];
}

/**
 * Explicit order transition graph and who may perform each transition.
 * PAYMENT_PENDING -> PAID is deliberately absent: only a verified payment
 * provider webhook may confirm payment, and none is integrated yet.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, readonly Role[]>>> = {
  PAYMENT_PENDING: { CANCELLED: ['OPERATIONS'] },
  PAID: { PREPARING: ['OPERATIONS', 'FULFILMENT'], CANCELLED: ['OPERATIONS'] },
  PREPARING: { DISPENSED: ['FULFILMENT'] },
  DISPENSED: { SHIPPED: ['FULFILMENT'] },
  SHIPPED: { DELIVERED: ['OPERATIONS', 'FULFILMENT'] },
  DELIVERED: {},
  CANCELLED: {},
};

/**
 * Member whose records a command touches. Firebase uses this to scope the
 * transactional read; it returns undefined for catalogue-level commands.
 */
export function commandMemberId(command: Command, actor: Actor): string | undefined {
  switch (command.type) {
    case 'review':
    case 'note':
    case 'nutrition':
    case 'followup':
    case 'orderStatus':
      return command.memberId;
    case 'message':
      return actor.role === 'MEMBER' ? actor.uid : command.memberId;
    case 'catalogue':
    case 'catalogueCreate':
    case 'stockAdjust':
      return undefined;
    default:
      return actor.uid;
  }
}

// ---------------------------------------------------------------------------
// Purchase gate (shared by checkout and the UI status line)
// ---------------------------------------------------------------------------

export function isNontrivialReference(ref: string): boolean {
  const trimmed = ref.trim();
  if (trimmed.length < 6) return false;
  return !/^(n\/?a|tbd|tba|none|pending|unknown|todo|x+|0+|-+)$/i.test(trimmed);
}

export type PurchaseBlock =
  | 'INACTIVE'
  | 'NOT_PURCHASABLE'
  | 'NOT_VERIFIED'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_QUANTITY'
  | 'OUT_OF_STOCK';

export const PURCHASE_BLOCK_MESSAGES: Record<PurchaseBlock, string> = {
  INACTIVE: 'This pathway is not currently offered.',
  NOT_PURCHASABLE: 'This treatment is not available to order yet.',
  NOT_VERIFIED: 'Regulatory status has not been verified, so it cannot be ordered.',
  APPROVAL_REQUIRED: 'A current clinician approval is required before ordering.',
  APPROVAL_QUANTITY: 'Your approval does not cover this quantity.',
  OUT_OF_STOCK: 'There is not enough stock to fill this order.',
};

export function currentApproval(
  store: Store,
  memberId: string,
  treatmentId: string,
  today: string,
): ApprovedTreatment | undefined {
  return Object.values(store.approvedTreatments).find(
    (a) => a.memberId === memberId && a.treatmentId === treatmentId && isApprovalCurrent(a, today),
  );
}

export function purchaseBlocks(
  store: Store,
  memberId: string,
  treatment: Treatment,
  quantity: number,
  today: string,
): PurchaseBlock[] {
  const blocks: PurchaseBlock[] = [];
  if (!treatment.active) blocks.push('INACTIVE');
  if (!treatment.purchasable) blocks.push('NOT_PURCHASABLE');
  if (treatment.regulatoryStatus !== 'VERIFIED' || !isNontrivialReference(treatment.regulatoryReference)) {
    blocks.push('NOT_VERIFIED');
  }
  if (treatment.requiresPrescription || treatment.requiresClinicianApproval) {
    const approval = currentApproval(store, memberId, treatment.id, today);
    if (!approval) blocks.push('APPROVAL_REQUIRED');
    else if (approval.remainingQuantity < quantity) blocks.push('APPROVAL_QUANTITY');
  }
  const stock = store.inventory[treatment.inventorySku];
  if (!stock || stock.onHand - stock.reserved < quantity) blocks.push('OUT_OF_STOCK');
  return blocks;
}

// ---------------------------------------------------------------------------
// applyCommand
// ---------------------------------------------------------------------------

export interface CommandResult {
  store: Store;
  /** Primary record created or changed, for the caller's convenience. */
  resultId?: string;
  auditEventId: string;
}

function fail(code: DomainErrorCode, message: string): never {
  throw new DomainError(code, message);
}

function requireMember(store: Store, memberId: string) {
  const member = store.members[memberId];
  if (!member) fail('NOT_FOUND', 'Member not found');
  return member;
}

function requireOnboarded(store: Store, memberId: string) {
  const member = requireMember(store, memberId);
  if (!member.onboardedAt) fail('PRECONDITION', 'Complete onboarding first');
  return member;
}

function requireAssignedClinician(store: Store, actor: Actor, memberId: string) {
  if (actor.role !== 'CLINICIAN' || !activeAssignedMemberIds(store, actor.uid).has(memberId)) {
    fail('FORBIDDEN', 'You are not the assigned clinician for this member');
  }
}

function hasCompleteAssessment(store: Store, memberId: string): boolean {
  return Object.values(store.healthAssessments).some(
    (a) => a.memberId === memberId && a.kind === 'INTAKE' && a.status === 'COMPLETE',
  );
}

function touchProfile(store: Store, memberId: string, at: string) {
  const profile = store.operationalProfiles[memberId];
  if (profile) profile.lastActivityAt = at;
}

function refreshOpenRequestCount(store: Store, memberId: string) {
  const profile = store.operationalProfiles[memberId];
  if (!profile) return;
  profile.openRequestCount = Object.values(store.treatmentRequests).filter(
    (r) => r.memberId === memberId && PENDING_REQUEST_STATUSES.includes(r.status),
  ).length;
}

function notify(
  store: Store,
  ctx: CommandContext,
  memberId: string,
  kind: NotificationRecord['kind'],
  title: string,
  body: string,
): string {
  const nid = ctx.newId('ntf');
  store.notifications[nid] = {
    id: nid,
    memberId,
    kind,
    title,
    body,
    read: false,
    createdAt: ctx.now.toISOString(),
  };
  return nid;
}

function openThread(
  store: Store,
  ctx: CommandContext,
  memberId: string,
  topic: MessageThread['topic'],
  subject: string,
): MessageThread {
  const at = ctx.now.toISOString();
  const thread: MessageThread = {
    id: ctx.newId('thr'),
    memberId,
    topic,
    subject: subject || defaultSubject(topic),
    escalated: topic === 'SIDE_EFFECT_CONCERN',
    escalatedAt: topic === 'SIDE_EFFECT_CONCERN' ? at : undefined,
    createdAt: at,
    lastMessageAt: at,
  };
  store.messageThreads[thread.id] = thread;
  return thread;
}

function defaultSubject(topic: MessageThread['topic']): string {
  return {
    GENERAL: 'General question',
    ORDER_DELIVERY: 'Order or delivery',
    CLINICAL: 'Clinical question',
    SIDE_EFFECT_CONCERN: 'Side effect or concern',
  }[topic];
}

function postMessage(store: Store, ctx: CommandContext, actor: Actor, thread: MessageThread, body: string): string {
  const mid = ctx.newId('msg');
  const at = ctx.now.toISOString();
  store.messages[mid] = {
    id: mid,
    threadId: thread.id,
    memberId: thread.memberId,
    topic: thread.topic,
    authorId: actor.uid,
    authorRole: actor.role,
    body,
    createdAt: at,
  };
  thread.lastMessageAt = at;
  return mid;
}

function cloneStore(store: Store): Store {
  return structuredClone(store);
}

/**
 * Apply a command to a copy of `current`. Throws `DomainError` on any
 * violation; the input store is never mutated.
 */
export function applyCommand(current: Store, actor: Actor, input: unknown, ctx: CommandContext): CommandResult {
  const command = parseCommand(input);
  if (!COMMAND_ROLES[command.type].includes(actor.role)) {
    fail('FORBIDDEN', `Role ${actor.role} cannot perform ${command.type}`);
  }

  const store = cloneStore(current);
  const at = ctx.now.toISOString();
  const today = localDate(ctx.now);
  const memberId = commandMemberId(command, actor);
  const targets: string[] = [];
  let resultId: string | undefined;

  switch (command.type) {
    case 'onboard': {
      const member = requireMember(store, actor.uid);
      if (member.onboardedAt) fail('CONFLICT', 'Onboarding is already complete');
      const { profile, body, goals, health, lifestyle, consents } = command;
      if (profile.dateOfBirth > today) fail('INVALID', 'Date of birth cannot be in the future');
      if (ageOn(profile.dateOfBirth, today) < 18) fail('PRECONDITION', 'This service is only available to adults aged 18 or over');
      const required: Record<(typeof REQUIRED_CONSENTS)[number], boolean> = {
        PRIVACY: consents.privacy,
        TERMS: consents.terms,
        HEALTH_DATA: consents.healthData,
        CLINICAL_SERVICE: consents.clinicalService,
      };
      const missing = REQUIRED_CONSENTS.filter((c) => !required[c]);
      if (missing.length) fail('PRECONDITION', `Required consent missing: ${missing.join(', ')}`);

      Object.assign(member, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        identity: profile.identity,
        phone: profile.phone,
        province: profile.province,
        city: profile.city,
        heightCm: body.heightCm,
        onboardedAt: at,
        updatedAt: at,
      });
      targets.push(member.id);

      const goalId = ctx.newId('goal');
      store.memberGoals[goalId] = { id: goalId, memberId: member.id, goals: goals.goals, motivation: goals.motivation, createdAt: at };
      const assessmentId = ctx.newId('asmt');
      store.healthAssessments[assessmentId] = {
        id: assessmentId,
        memberId: member.id,
        kind: 'INTAKE',
        status: 'COMPLETE',
        testingInterest: command.testingInterest,
        completedAt: at,
      };
      store.medicalHistories[member.id] = { id: member.id, memberId: member.id, ...health, updatedAt: at };
      store.lifestyleProfiles[member.id] = { id: member.id, memberId: member.id, ...lifestyle, updatedAt: at };
      const weightId = ctx.newId('meas');
      store.measurements[weightId] = {
        id: weightId,
        memberId: member.id,
        kind: 'WEIGHT',
        value: body.weightKg,
        unit: 'kg',
        recordedAt: at,
        source: 'ONBOARDING',
      };
      const consentValues: Record<ConsentType, boolean> = {
        ...required,
        COMMUNICATIONS: consents.communications,
        MARKETING: consents.marketing,
      };
      for (const [type, granted] of Object.entries(consentValues) as [ConsentType, boolean][]) {
        const cid = `${member.id}_${type}`;
        store.consents[cid] = { id: cid, memberId: member.id, type, granted, version: CONSENT_VERSION, recordedAt: at };
      }
      const profileRecord = store.operationalProfiles[member.id];
      store.operationalProfiles[member.id] = {
        id: member.id,
        memberId: member.id,
        displayName: `${profile.firstName} ${profile.lastName.charAt(0)}.`,
        onboardingStatus: 'COMPLETE',
        province: profile.province,
        hasDeliveryAddress: Boolean(member.deliveryAddress),
        openRequestCount: profileRecord?.openRequestCount ?? 0,
        consentWithdrawn: false,
        lastActivityAt: at,
      };
      targets.push(goalId, assessmentId, weightId);
      resultId = assessmentId;
      break;
    }

    case 'request': {
      requireOnboarded(store, actor.uid);
      const treatment = store.treatments[command.treatmentId];
      if (!treatment || !treatment.active || !treatment.public) fail('NOT_FOUND', 'This pathway is not available');
      const duplicate = Object.values(store.treatmentRequests).some(
        (r) => r.memberId === actor.uid && r.treatmentId === treatment.id && PENDING_REQUEST_STATUSES.includes(r.status),
      );
      if (duplicate) fail('CONFLICT', 'You already have a request in progress for this pathway');
      const rid = ctx.newId('req');
      store.treatmentRequests[rid] = {
        id: rid,
        memberId: actor.uid,
        treatmentId: treatment.id,
        status: 'OPEN',
        reason: command.reason,
        createdAt: at,
      };
      refreshOpenRequestCount(store, actor.uid);
      targets.push(rid);
      resultId = rid;
      break;
    }

    case 'review': {
      requireAssignedClinician(store, actor, command.memberId);
      const request = store.treatmentRequests[command.requestId];
      if (!request || request.memberId !== command.memberId) fail('NOT_FOUND', 'Request not found');
      if (!PENDING_REQUEST_STATUSES.includes(request.status)) fail('CONFLICT', 'This request has already been resolved');
      if (!hasCompleteAssessment(store, request.memberId)) fail('PRECONDITION', 'A complete health assessment is required before review');
      if (command.reviewDate <= today) fail('INVALID', 'Review date must be in the future');
      const treatment = store.treatments[request.treatmentId];
      if (!treatment) fail('NOT_FOUND', 'Treatment not found');

      request.status = command.decision;
      request.reviewedBy = actor.uid;
      request.reviewedAt = at;
      request.decisionNote = command.note;
      targets.push(request.id);

      if (command.decision === 'ALTERNATIVE_RECOMMENDED') {
        const alt = command.alternativeTreatmentId && store.treatments[command.alternativeTreatmentId];
        if (!alt || alt.id === treatment.id) fail('INVALID', 'Choose a different pathway to recommend');
        request.alternativeTreatmentId = alt.id;
      } else if (command.alternativeTreatmentId) {
        fail('INVALID', 'An alternative is only recorded when recommending one');
      }

      if (command.decision === 'APPROVED') {
        const plan = command.approval;
        if (!plan) fail('INVALID', 'Approval details are required');
        if (!treatment.active) fail('PRECONDITION', 'Inactive pathways cannot be approved');
        if (plan.startDate < today) fail('INVALID', 'Start date cannot be in the past');
        const expiresOn = addDays(plan.startDate, plan.durationDays - 1);
        if (plan.schedule.kind === 'CUSTOM' && plan.schedule.dates.some((d) => d < plan.startDate || d > expiresOn)) {
          fail('INVALID', 'Custom dates must fall within the approval period');
        }
        // Supersede any previous active approval for the same treatment.
        for (const prev of Object.values(store.approvedTreatments)) {
          if (prev.memberId === request.memberId && prev.treatmentId === treatment.id && prev.status === 'ACTIVE') {
            prev.status = 'SUPERSEDED';
            prev.supersededAt = at;
            targets.push(prev.id);
            for (const r of Object.values(store.reminders)) {
              if (r.approvalId === prev.id && r.active) {
                r.active = false;
                r.updatedAt = at;
                targets.push(r.id);
              }
            }
            for (const g of Object.values(store.regimens)) {
              if (g.approvalId === prev.id) g.active = false;
            }
          }
        }
        const approvalId = ctx.newId('apr');
        store.approvedTreatments[approvalId] = {
          id: approvalId,
          memberId: request.memberId,
          treatmentId: treatment.id,
          requestId: request.id,
          clinicianId: actor.uid,
          status: 'ACTIVE',
          approvedQuantity: plan.quantity,
          remainingQuantity: plan.quantity,
          startDate: plan.startDate,
          expiresOn,
          reviewDate: command.reviewDate,
          createdAt: at,
        };
        const regimenId = ctx.newId('rgm');
        store.regimens[regimenId] = {
          id: regimenId,
          memberId: request.memberId,
          approvalId,
          treatmentId: treatment.id,
          dose: plan.dose,
          doseUnit: plan.doseUnit,
          schedule: plan.schedule,
          startDate: plan.startDate,
          endDate: expiresOn,
          instructions: plan.instructions,
          active: true,
        };
        const reminderId = ctx.newId('rmd');
        store.reminders[reminderId] = {
          id: reminderId,
          memberId: request.memberId,
          regimenId,
          approvalId,
          time: plan.reminderTime,
          active: true,
          createdAt: at,
          updatedAt: at,
        };
        const followUpId = ctx.newId('fu');
        store.followUps[followUpId] = {
          id: followUpId,
          memberId: request.memberId,
          approvalId,
          dueDate: command.reviewDate,
          reason: `Review of ${treatment.name}`,
          status: 'SCHEDULED',
          createdBy: actor.uid,
          createdAt: at,
        };
        targets.push(approvalId, regimenId, reminderId, followUpId);
        resultId = approvalId;
      } else if (command.approval) {
        fail('INVALID', 'Approval details are only accepted with an approval');
      }

      const titles: Record<typeof command.decision, string> = {
        APPROVED: 'Your clinician has approved a treatment plan',
        DECLINED: 'Your clinician has reviewed your request',
        NEEDS_INFORMATION: 'Your clinician needs more information',
        ALTERNATIVE_RECOMMENDED: 'Your clinician has recommended a different pathway',
      };
      targets.push(notify(store, ctx, request.memberId, 'DECISION', titles[command.decision], 'Open your dashboard to see the details.'));
      refreshOpenRequestCount(store, request.memberId);
      touchProfile(store, request.memberId, at);
      resultId ??= request.id;
      break;
    }

    case 'adherence': {
      const approval = store.approvedTreatments[command.approvalId];
      if (!approval || approval.memberId !== actor.uid) fail('NOT_FOUND', 'Treatment plan not found');
      if (!isApprovalCurrent(approval, today)) fail('PRECONDITION', 'This treatment plan is not currently active');
      const regimen = Object.values(store.regimens).find((r) => r.approvalId === approval.id && r.active);
      if (!regimen) fail('PRECONDITION', 'No active regimen for this plan');
      if (command.dueDate > today) fail('INVALID', 'You can only record doses that are due');
      if (!isScheduledOn(regimen, command.dueDate)) fail('INVALID', 'No dose is scheduled for that date');
      const existing = Object.values(store.adherenceEvents).filter(
        (e) => e.approvalId === approval.id && e.dueDate === command.dueDate,
      );
      if (existing.some((e) => e.action === 'TAKEN' || e.action === 'MISSED')) {
        fail('CONFLICT', 'This dose has already been recorded');
      }
      let snoozeUntil: string | undefined;
      if (command.action === 'SNOOZED') {
        const m = command.snoozeMinutes;
        if (m === undefined || m < 15 || m > 120) fail('INVALID', 'Snooze must be between 15 and 120 minutes');
        snoozeUntil = new Date(ctx.now.getTime() + m * 60_000).toISOString();
      } else if (command.snoozeMinutes !== undefined) {
        fail('INVALID', 'Snooze minutes only apply to a snooze');
      }
      const eid = ctx.newId('adh');
      store.adherenceEvents[eid] = {
        id: eid,
        memberId: actor.uid,
        approvalId: approval.id,
        regimenId: regimen.id,
        dueDate: command.dueDate,
        action: command.action,
        snoozeUntil,
        recordedAt: at,
      };
      targets.push(eid);
      resultId = eid;
      break;
    }

    case 'notificationTime': {
      const reminder = store.reminders[command.reminderId];
      if (!reminder || reminder.memberId !== actor.uid) fail('NOT_FOUND', 'Reminder not found');
      if (!reminder.active) fail('PRECONDITION', 'This reminder is no longer active');
      reminder.time = command.time;
      reminder.updatedAt = at;
      targets.push(reminder.id);
      resultId = reminder.id;
      break;
    }

    case 'measurement': {
      requireMember(store, actor.uid);
      const m = command.measurement;
      if (m.kind === 'BLOOD_PRESSURE' && m.value2 >= m.value) fail('INVALID', 'Diastolic must be lower than systolic');
      if (m.unit !== MEASUREMENT_UNITS[m.kind]) fail('INVALID', 'Unit does not match measurement');
      const mid = ctx.newId('meas');
      store.measurements[mid] = {
        id: mid,
        memberId: actor.uid,
        kind: m.kind,
        value: m.value,
        value2: m.kind === 'BLOOD_PRESSURE' ? m.value2 : undefined,
        unit: m.unit,
        recordedAt: at,
        source: 'MEMBER',
      };
      targets.push(mid);
      resultId = mid;
      break;
    }

    case 'deliveryAddress': {
      const member = requireMember(store, actor.uid);
      member.deliveryAddress = command.address;
      member.updatedAt = at;
      const profile = store.operationalProfiles[member.id];
      if (profile) profile.hasDeliveryAddress = true;
      targets.push(member.id);
      resultId = member.id;
      break;
    }

    case 'checkout': {
      const member = requireOnboarded(store, actor.uid);
      const treatment = store.treatments[command.treatmentId];
      if (!treatment) fail('NOT_FOUND', 'Treatment not found');
      const blocks = purchaseBlocks(store, actor.uid, treatment, command.quantity, today);
      if (blocks.length) fail('PRECONDITION', PURCHASE_BLOCK_MESSAGES[blocks[0]]);
      const address: Address | undefined = command.address ?? member.deliveryAddress;
      if (!address) fail('INVALID', 'A delivery address is required');

      const stock = store.inventory[treatment.inventorySku];
      stock.reserved += command.quantity;
      stock.updatedAt = at;
      let approvalId: string | undefined;
      if (treatment.requiresPrescription || treatment.requiresClinicianApproval) {
        const approval = currentApproval(store, actor.uid, treatment.id, today)!;
        approval.remainingQuantity -= command.quantity;
        approvalId = approval.id;
        targets.push(approval.id);
      }
      const simulated = ctx.mode === 'demo';
      const status: OrderStatus = simulated ? 'PAID' : 'PAYMENT_PENDING';
      const total = treatment.priceCents * command.quantity;
      const orderId = ctx.newId('ord');
      store.orders[orderId] = {
        id: orderId,
        memberId: actor.uid,
        treatmentId: treatment.id,
        approvalId,
        status,
        quantity: command.quantity,
        totalCents: total,
        currency: 'ZAR',
        deliveryAddress: address,
        simulated,
        statusHistory: [{ status, at, by: actor.uid }],
        createdAt: at,
        updatedAt: at,
      };
      const itemId = ctx.newId('itm');
      store.orderItems[itemId] = {
        id: itemId,
        orderId,
        memberId: actor.uid,
        treatmentId: treatment.id,
        sku: treatment.inventorySku,
        quantity: command.quantity,
        unitPriceCents: treatment.priceCents,
      };
      const paymentId = ctx.newId('pay');
      store.payments[paymentId] = {
        id: paymentId,
        orderId,
        memberId: actor.uid,
        provider: simulated ? 'DEMO_SIMULATION' : 'NONE',
        status: simulated ? 'SIMULATED_PAID' : 'AWAITING_PROVIDER',
        amountCents: total,
        currency: 'ZAR',
        createdAt: at,
        updatedAt: at,
      };
      targets.push(orderId, itemId, paymentId, stock.id);
      targets.push(
        notify(
          store,
          ctx,
          actor.uid,
          'ORDER',
          simulated ? 'Demo order created (no payment taken)' : 'Order created: payment not yet available',
          simulated
            ? 'This is a simulated demo order. No money was charged.'
            : 'Online payment is not connected yet, so this order is waiting for payment.',
        ),
      );
      touchProfile(store, actor.uid, at);
      resultId = orderId;
      break;
    }

    case 'message': {
      if (actor.role !== 'MEMBER' && !command.memberId) fail('INVALID', 'Choose a member to message');
      let thread: MessageThread;
      if (command.threadId) {
        const existing = store.messageThreads[command.threadId];
        if (!existing) fail('NOT_FOUND', 'Conversation not found');
        thread = existing;
      } else {
        const topic = command.topic ?? 'GENERAL';
        const target = actor.role === 'MEMBER' ? actor.uid : command.memberId;
        if (!target) fail('INVALID', 'Choose a member to message');
        requireMember(store, target);
        thread = openThread(store, ctx, target, topic, command.subject ?? '');
      }
      if (actor.role === 'MEMBER' && thread.memberId !== actor.uid) fail('NOT_FOUND', 'Conversation not found');
      if (actor.role !== 'MEMBER' && command.memberId && command.memberId !== thread.memberId) {
        fail('INVALID', 'Conversation does not belong to this member');
      }
      if (actor.role === 'CLINICIAN') requireAssignedClinician(store, actor, thread.memberId);
      if (actor.role === 'OPERATIONS' && !OPERATIONS_TOPICS.includes(thread.topic)) {
        fail('FORBIDDEN', 'Operations can only handle general and order or delivery messages');
      }
      targets.push(thread.id, postMessage(store, ctx, actor, thread, command.body));
      if (actor.role !== 'MEMBER') {
        targets.push(notify(store, ctx, thread.memberId, 'MESSAGE', 'New message from your care team', 'Open your messages to read it.'));
      }
      touchProfile(store, thread.memberId, at);
      resultId = thread.id;
      break;
    }

    case 'note': {
      requireAssignedClinician(store, actor, command.memberId);
      const nid = ctx.newId('note');
      store.clinicalNotes[nid] = { id: nid, memberId: command.memberId, clinicianId: actor.uid, body: command.body, createdAt: at };
      targets.push(nid);
      resultId = nid;
      break;
    }

    case 'nutrition': {
      requireAssignedClinician(store, actor, command.memberId);
      requireMember(store, command.memberId);
      store.nutritionProfiles[command.memberId] = {
        id: command.memberId,
        memberId: command.memberId,
        calorieTarget: command.calorieTarget,
        proteinTargetG: command.proteinTargetG,
        carbTargetG: command.carbTargetG,
        fatTargetG: command.fatTargetG,
        notes: command.notes,
        updatedBy: actor.uid,
        updatedAt: at,
      };
      targets.push(command.memberId);
      resultId = command.memberId;
      break;
    }

    case 'checkin': {
      requireOnboarded(store, actor.uid);
      const cid = ctx.newId('chk');
      store.healthAssessments[cid] = {
        id: cid,
        memberId: actor.uid,
        kind: 'CHECKIN',
        status: 'COMPLETE',
        checkin: {
          mood: command.mood,
          energy: command.energy,
          sideEffects: command.sideEffects,
          needSupport: command.needSupport,
          notes: command.notes,
        },
        completedAt: at,
      };
      targets.push(cid);
      if (command.needSupport) {
        const thread = openThread(store, ctx, actor.uid, 'SIDE_EFFECT_CONCERN', 'Support requested from check-in');
        const body = command.notes || 'I asked for support in my health check-in.';
        targets.push(thread.id, postMessage(store, ctx, actor, thread, body));
      }
      touchProfile(store, actor.uid, at);
      resultId = cid;
      break;
    }

    case 'followup': {
      requireMember(store, command.memberId);
      if (actor.role === 'CLINICIAN') requireAssignedClinician(store, actor, command.memberId);
      if (command.action === 'schedule') {
        if (command.dueDate < today) fail('INVALID', 'Follow-up date cannot be in the past');
        if (command.approvalId) {
          const approval = store.approvedTreatments[command.approvalId];
          if (!approval || approval.memberId !== command.memberId) fail('NOT_FOUND', 'Treatment plan not found');
        }
        const fid = ctx.newId('fu');
        store.followUps[fid] = {
          id: fid,
          memberId: command.memberId,
          approvalId: command.approvalId,
          dueDate: command.dueDate,
          reason: command.reason,
          status: 'SCHEDULED',
          createdBy: actor.uid,
          createdAt: at,
        };
        targets.push(fid);
        resultId = fid;
      } else {
        if (actor.role !== 'CLINICIAN') fail('FORBIDDEN', 'Only the assigned clinician can complete a clinical follow-up');
        const followUp = store.followUps[command.followUpId];
        if (!followUp || followUp.memberId !== command.memberId) fail('NOT_FOUND', 'Follow-up not found');
        if (followUp.status === 'COMPLETED') fail('CONFLICT', 'Follow-up already completed');
        followUp.status = 'COMPLETED';
        followUp.completedBy = actor.uid;
        followUp.completedAt = at;
        followUp.outcome = command.outcome;
        targets.push(followUp.id);
        resultId = followUp.id;
      }
      break;
    }

    case 'catalogue': {
      const treatment = store.treatments[command.treatmentId];
      if (!treatment) fail('NOT_FOUND', 'Treatment not found');
      const next: Treatment = {
        ...treatment,
        ...command.changes,
        administration: { ...treatment.administration, ...command.changes.administration },
        updatedAt: at,
      };
      if (next.purchasable) {
        if (next.regulatoryStatus !== 'VERIFIED') fail('PRECONDITION', 'Only regulatorily verified treatments can be purchasable');
        if (!isNontrivialReference(next.regulatoryReference)) fail('PRECONDITION', 'A valid registration reference is required to make this purchasable');
        if (!next.active) fail('PRECONDITION', 'Inactive treatments cannot be purchasable');
      }
      store.treatments[treatment.id] = next;
      targets.push(treatment.id);
      resultId = treatment.id;
      break;
    }

    case 'catalogueCreate': {
      if (Object.values(store.treatments).some((t) => t.slug === command.slug)) fail('CONFLICT', 'A pathway with this slug already exists');
      if (store.inventory[command.inventorySku]) fail('CONFLICT', 'This SKU already exists');
      const tid = ctx.newId('trt');
      store.treatments[tid] = {
        id: tid,
        slug: command.slug,
        name: command.name,
        summary: command.summary,
        clinicalDescription: '',
        category: command.category,
        outcomes: [],
        requiresPrescription: true,
        requiresClinicianApproval: true,
        regulatoryStatus: 'UNCONFIRMED',
        regulatoryReference: '',
        active: false,
        public: false,
        purchasable: false,
        priceCents: 0,
        currency: 'ZAR',
        billing: 'ONE_OFF',
        supplyDays: 28,
        unitsPerPack: 1,
        administration: { device: 'PEN', route: 'Subcutaneous', instructions: '' },
        requiredAssessment: true,
        requiredLabs: [],
        followUpDays: 28,
        inventorySku: command.inventorySku,
        demoFictional: ctx.mode === 'demo',
        createdAt: at,
        updatedAt: at,
      };
      store.inventory[command.inventorySku] = {
        id: command.inventorySku,
        sku: command.inventorySku,
        treatmentId: tid,
        onHand: 0,
        reserved: 0,
        updatedAt: at,
      };
      targets.push(tid, command.inventorySku);
      resultId = tid;
      break;
    }

    case 'stockAdjust': {
      const stock = store.inventory[command.sku];
      if (!stock) fail('NOT_FOUND', 'SKU not found');
      if (command.onHand < stock.reserved) fail('INVALID', `On-hand stock cannot be below the ${stock.reserved} units reserved for orders`);
      stock.onHand = command.onHand;
      stock.updatedAt = at;
      targets.push(stock.id);
      resultId = stock.id;
      break;
    }

    case 'withdrawConsent': {
      const cid = `${actor.uid}_${command.consentType}`;
      const consent = store.consents[cid];
      if (!consent || !consent.granted || consent.withdrawnAt) fail('PRECONDITION', 'There is no active consent of this type to withdraw');
      consent.granted = false;
      consent.withdrawnAt = at;
      const required = (REQUIRED_CONSENTS as readonly string[]).includes(command.consentType);
      const profile = store.operationalProfiles[actor.uid];
      if (profile && required) profile.consentWithdrawn = true;
      targets.push(
        consent.id,
        notify(
          store,
          ctx,
          actor.uid,
          'CONSENT',
          'Your care team has been notified',
          required
            ? 'You withdrew a consent the service relies on. Your care team will contact you about what this means for your care.'
            : 'Your preference has been updated.',
        ),
      );
      touchProfile(store, actor.uid, at);
      resultId = consent.id;
      break;
    }

    case 'orderStatus': {
      const order = store.orders[command.orderId];
      if (!order || order.memberId !== command.memberId) fail('NOT_FOUND', 'Order not found');
      const allowed = ORDER_TRANSITIONS[order.status][command.status];
      if (!allowed) fail('CONFLICT', `An order cannot move from ${order.status} to ${command.status}`);
      if (!allowed.includes(actor.role)) fail('FORBIDDEN', `Role ${actor.role} cannot move an order to ${command.status}`);
      if (command.status === 'CANCELLED' && order.status === 'PAID' && !order.simulated) {
        fail('PRECONDITION', 'Paid orders need a refund, and refunds are not integrated yet');
      }
      const item = Object.values(store.orderItems).find((i) => i.orderId === order.id);
      const stock = item && store.inventory[item.sku];
      if (command.status === 'CANCELLED') {
        if (stock) {
          stock.reserved = Math.max(0, stock.reserved - order.quantity);
          stock.updatedAt = at;
          targets.push(stock.id);
        }
        const approval = order.approvalId ? store.approvedTreatments[order.approvalId] : undefined;
        if (approval) {
          approval.remainingQuantity = Math.min(approval.approvedQuantity, approval.remainingQuantity + order.quantity);
          targets.push(approval.id);
        }
        for (const p of Object.values(store.payments)) {
          if (p.orderId === order.id) {
            p.status = 'VOID';
            p.updatedAt = at;
            targets.push(p.id);
          }
        }
      }
      if (command.status === 'DISPENSED') {
        if (!stock) fail('PRECONDITION', 'No inventory record for this order');
        stock.onHand -= order.quantity;
        stock.reserved = Math.max(0, stock.reserved - order.quantity);
        stock.updatedAt = at;
        const sid = `shp_${order.id}`;
        store.shipments[sid] = { id: sid, orderId: order.id, memberId: order.memberId, status: 'READY', deliveryAddress: order.deliveryAddress, updatedAt: at };
        targets.push(stock.id, sid);
      }
      if (command.status === 'SHIPPED' || command.status === 'DELIVERED') {
        const shipment = store.shipments[`shp_${order.id}`];
        if (!shipment) fail('PRECONDITION', 'Shipment record missing');
        shipment.status = command.status === 'SHIPPED' ? 'IN_TRANSIT' : 'DELIVERED';
        if (command.courierReference) shipment.courierReference = command.courierReference;
        shipment.updatedAt = at;
        targets.push(shipment.id);
      }
      order.status = command.status;
      order.updatedAt = at;
      order.statusHistory.push({ status: command.status, at, by: actor.uid });
      targets.push(order.id);
      const labels: Partial<Record<OrderStatus, string>> = {
        CANCELLED: 'Your order was cancelled',
        DISPENSED: 'Your order has been dispensed',
        SHIPPED: 'Your order is on its way',
        DELIVERED: 'Your order was delivered',
      };
      const label = labels[command.status];
      if (label) targets.push(notify(store, ctx, order.memberId, 'ORDER', label, 'Open your orders for details.'));
      resultId = order.id;
      break;
    }

    case 'readNotification': {
      const n = store.notifications[command.notificationId];
      if (!n || n.memberId !== actor.uid) fail('NOT_FOUND', 'Notification not found');
      n.read = true;
      targets.push(n.id);
      resultId = n.id;
      break;
    }
  }

  const auditEventId = ctx.newId('aud');
  const event: AuditEvent = {
    id: auditEventId,
    actorId: actor.uid,
    actorRole: actor.role,
    action: command.type,
    memberId,
    targets: [...new Set(targets)],
    at,
  };
  if (event.memberId === undefined) delete event.memberId;
  store.auditEvents[auditEventId] = event;
  return { store, resultId, auditEventId };
}

/** Records that differ between two stores, for transactional persistence. */
export function diffStores(before: Store, after: Store): { collection: keyof Store; id: string; data: unknown }[] {
  const changes: { collection: keyof Store; id: string; data: unknown }[] = [];
  for (const collection of Object.keys(after) as (keyof Store)[]) {
    const prev = before[collection] as Record<string, unknown>;
    const next = after[collection] as Record<string, unknown>;
    for (const [rid, data] of Object.entries(next)) {
      if (JSON.stringify(prev[rid]) !== JSON.stringify(data)) changes.push({ collection, id: rid, data });
    }
    for (const rid of Object.keys(prev)) {
      if (!(rid in next)) throw new Error(`Domain commands never delete records (${collection}/${rid})`);
    }
  }
  return changes;
}

/** Strip `undefined` values so records are valid Firestore documents. */
export function toFirestoreData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
