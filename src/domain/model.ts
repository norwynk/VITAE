/**
 * Domain model: roles, collection names, record types, scheduling, the
 * role-scoped visibility projection and South African date helpers.
 *
 * This module is shared by the browser, the demo server and Cloud Functions.
 * It must stay free of Firebase, Node-only and DOM-only imports.
 */

export const SERVICE_TIME_ZONE = 'Africa/Johannesburg';

/**
 * Neutral sender label. The health division has no approved name yet, so
 * reminders and notifications use this until a final name is signed off.
 */
export const NEUTRAL_SENDER_LABEL = 'Your care team';

export const ROLES = [
  'MEMBER',
  'CLINICIAN',
  'OPERATIONS',
  'SUPER_ADMIN',
  'FULFILMENT',
  'CORPORATE_ADMIN',
] as const;
export type Role = (typeof ROLES)[number];

/** Staff roles that must use a second factor in production. */
export const MFA_REQUIRED_ROLES: readonly Role[] = ['CLINICIAN', 'OPERATIONS', 'SUPER_ADMIN', 'FULFILMENT'];

export const COLLECTIONS = [
  'users',
  'members',
  'memberGoals',
  'healthAssessments',
  'medicalHistories',
  'lifestyleProfiles',
  'nutritionProfiles',
  'measurements',
  'biomarkerDefinitions',
  'biomarkerResults',
  'dnaTests',
  'dnaInsights',
  'documents',
  'treatments',
  'treatmentRequests',
  'approvedTreatments',
  'regimens',
  'reminders',
  'adherenceEvents',
  'orders',
  'orderItems',
  'payments',
  'shipments',
  'careTeams',
  'providerAssignments',
  'messages',
  'messageThreads',
  'clinicalNotes',
  'followUps',
  'notifications',
  'consents',
  'auditEvents',
  'corporateAccounts',
  'analyticsEvents',
  'operationalProfiles',
  'inventory',
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

/** Collections whose records belong to a single member (keyed by `memberId`). */
export const MEMBER_COLLECTIONS = [
  'members',
  'memberGoals',
  'healthAssessments',
  'medicalHistories',
  'lifestyleProfiles',
  'nutritionProfiles',
  'measurements',
  'biomarkerResults',
  'dnaTests',
  'dnaInsights',
  'documents',
  'treatmentRequests',
  'approvedTreatments',
  'regimens',
  'reminders',
  'adherenceEvents',
  'orders',
  'orderItems',
  'payments',
  'shipments',
  'providerAssignments',
  'messages',
  'messageThreads',
  'clinicalNotes',
  'followUps',
  'notifications',
  'consents',
  'operationalProfiles',
] as const satisfies readonly CollectionName[];
export type MemberCollectionName = (typeof MEMBER_COLLECTIONS)[number];

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;
export type Province = (typeof SA_PROVINCES)[number];

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface Address {
  recipient: string;
  line1: string;
  line2?: string;
  suburb: string;
  city: string;
  province: Province;
  postalCode: string;
  phone: string;
}

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  pushTokens?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberRecord {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth?: string;
  identity?: { type: 'SA_ID' | 'PASSPORT'; number: string };
  phone?: string;
  province?: Province;
  city?: string;
  heightCm?: number;
  deliveryAddress?: Address;
  onboardedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalProfile {
  id: string;
  memberId: string;
  displayName: string;
  onboardingStatus: 'NOT_STARTED' | 'COMPLETE';
  province?: Province;
  hasDeliveryAddress: boolean;
  openRequestCount: number;
  consentWithdrawn: boolean;
  lastActivityAt: string;
}

export interface MemberGoal {
  id: string;
  memberId: string;
  goals: string[];
  motivation: string;
  createdAt: string;
}

export interface HealthAssessment {
  id: string;
  memberId: string;
  kind: 'INTAKE' | 'CHECKIN';
  status: 'COMPLETE' | 'INCOMPLETE';
  testingInterest?: boolean;
  checkin?: { mood: number; energy: number; sideEffects: boolean; needSupport: boolean; notes: string };
  completedAt: string;
}

export interface MedicalHistory {
  id: string;
  memberId: string;
  conditions: string[];
  medications: string;
  allergies: string;
  pregnancyOrBreastfeeding: boolean;
  previousPeptideUse: boolean;
  notes: string;
  updatedAt: string;
}

export interface LifestyleProfile {
  id: string;
  memberId: string;
  activityLevel: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE';
  sleepHours: number;
  smoking: boolean;
  alcoholUnitsPerWeek: number;
  diet: string;
  updatedAt: string;
}

export interface NutritionProfile {
  id: string;
  memberId: string;
  calorieTarget: number;
  proteinTargetG: number;
  carbTargetG?: number;
  fatTargetG?: number;
  notes: string;
  updatedBy: string;
  updatedAt: string;
}

export const MEASUREMENT_UNITS = {
  WEIGHT: 'kg',
  SLEEP: 'hours',
  BLOOD_PRESSURE: 'mmHg',
  BODY_COMPOSITION: 'percent',
} as const;
export type MeasurementKind = keyof typeof MEASUREMENT_UNITS;

export interface Measurement {
  id: string;
  memberId: string;
  kind: MeasurementKind;
  value: number;
  /** Diastolic value for blood pressure. */
  value2?: number;
  unit: string;
  recordedAt: string;
  source: 'MEMBER' | 'ONBOARDING';
}

export interface BiomarkerDefinition {
  id: string;
  name: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
}

export interface BiomarkerResult {
  id: string;
  memberId: string;
  biomarkerId: string;
  value: number;
  collectedOn: string;
}

/** Structural only: no vendor ordering or results ingestion exists yet. */
export interface DnaTest {
  id: string;
  memberId: string;
  status: 'NOT_ORDERED';
  createdAt: string;
}

export interface DnaInsight {
  id: string;
  memberId: string;
  dnaTestId: string;
  title: string;
  summary: string;
}

export const DOCUMENT_CATEGORIES = ['LAB_RESULT', 'PRESCRIPTION', 'IDENTITY', 'MEDICAL_LETTER', 'OTHER'] as const;
export const DOCUMENT_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export interface DocumentRecord {
  id: string;
  memberId: string;
  name: string;
  category: (typeof DOCUMENT_CATEGORIES)[number];
  contentType: (typeof DOCUMENT_CONTENT_TYPES)[number];
  sizeBytes: number;
  storagePath: string;
  scanStatus: 'QUARANTINED' | 'CLEAN' | 'REJECTED';
  uploadedAt: string;
}

export const REGULATORY_STATUSES = ['UNCONFIRMED', 'VERIFIED', 'NOT_PERMITTED'] as const;
export type RegulatoryStatus = (typeof REGULATORY_STATUSES)[number];

export interface Treatment {
  id: string;
  slug: string;
  name: string;
  summary: string;
  clinicalDescription: string;
  category: string;
  outcomes: string[];
  requiresPrescription: boolean;
  requiresClinicianApproval: boolean;
  regulatoryStatus: RegulatoryStatus;
  regulatoryReference: string;
  active: boolean;
  public: boolean;
  purchasable: boolean;
  priceCents: number;
  currency: 'ZAR';
  billing: 'ONE_OFF' | 'MONTHLY';
  supplyDays: number;
  unitsPerPack: number;
  administration: { device: 'PEN' | 'OTHER'; route: string; instructions: string };
  requiredAssessment: boolean;
  requiredLabs: string[];
  followUpDays: number;
  inventorySku: string;
  demoFictional: boolean;
  createdAt: string;
  updatedAt: string;
}

export const REQUEST_STATUSES = [
  'OPEN',
  'IN_REVIEW',
  'NEEDS_INFORMATION',
  'APPROVED',
  'DECLINED',
  'ALTERNATIVE_RECOMMENDED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
/** A request in one of these states blocks a duplicate request for the same treatment. */
export const PENDING_REQUEST_STATUSES: readonly RequestStatus[] = ['OPEN', 'IN_REVIEW', 'NEEDS_INFORMATION'];

export interface TreatmentRequest {
  id: string;
  memberId: string;
  treatmentId: string;
  status: RequestStatus;
  reason: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  decisionNote?: string;
  alternativeTreatmentId?: string;
}

export interface ApprovedTreatment {
  id: string;
  memberId: string;
  treatmentId: string;
  requestId: string;
  clinicianId: string;
  status: 'ACTIVE' | 'SUPERSEDED';
  approvedQuantity: number;
  remainingQuantity: number;
  startDate: string;
  /** Last local date (inclusive) on which the approval is valid. */
  expiresOn: string;
  reviewDate: string;
  createdAt: string;
  supersededAt?: string;
}

export type Schedule =
  | { kind: 'DAILY' }
  | { kind: 'WEEKLY'; weekday: number }
  | { kind: 'WEEKDAYS'; weekdays: number[] }
  | { kind: 'EVERY_N_DAYS'; interval: number }
  | { kind: 'CUSTOM'; dates: string[] };

export interface Regimen {
  id: string;
  memberId: string;
  approvalId: string;
  treatmentId: string;
  dose: number;
  doseUnit: string;
  schedule: Schedule;
  startDate: string;
  endDate: string;
  instructions: string;
  active: boolean;
}

export interface Reminder {
  id: string;
  memberId: string;
  regimenId: string;
  approvalId: string;
  /** Local time HH:MM in Africa/Johannesburg. */
  time: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdherenceEvent {
  id: string;
  memberId: string;
  approvalId: string;
  regimenId: string;
  dueDate: string;
  action: 'TAKEN' | 'MISSED' | 'SNOOZED';
  snoozeUntil?: string;
  recordedAt: string;
}

export const ORDER_STATUSES = [
  'PAYMENT_PENDING',
  'PAID',
  'PREPARING',
  'DISPENSED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  memberId: string;
  treatmentId: string;
  approvalId?: string;
  status: OrderStatus;
  quantity: number;
  totalCents: number;
  currency: 'ZAR';
  deliveryAddress: Address;
  /** True for demo orders: no money moved. */
  simulated: boolean;
  statusHistory: { status: OrderStatus; at: string; by: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  memberId: string;
  treatmentId: string;
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Payment {
  id: string;
  orderId: string;
  memberId: string;
  provider: 'NONE' | 'DEMO_SIMULATION';
  status: 'AWAITING_PROVIDER' | 'SIMULATED_PAID' | 'VOID';
  amountCents: number;
  currency: 'ZAR';
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  memberId: string;
  status: 'READY' | 'IN_TRANSIT' | 'DELIVERED';
  deliveryAddress: Address;
  courierReference?: string;
  updatedAt: string;
}

export interface CareTeam {
  id: string;
  name: string;
  clinicianIds: string[];
}

export interface ProviderAssignment {
  id: string;
  memberId: string;
  clinicianId: string;
  active: boolean;
  createdAt: string;
}

export const THREAD_TOPICS = ['GENERAL', 'ORDER_DELIVERY', 'CLINICAL', 'SIDE_EFFECT_CONCERN'] as const;
export type ThreadTopic = (typeof THREAD_TOPICS)[number];
/** Topics operations staff may read and answer. */
export const OPERATIONS_TOPICS: readonly ThreadTopic[] = ['GENERAL', 'ORDER_DELIVERY'];

export interface MessageThread {
  id: string;
  memberId: string;
  topic: ThreadTopic;
  subject: string;
  escalated: boolean;
  escalatedAt?: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  memberId: string;
  topic: ThreadTopic;
  authorId: string;
  authorRole: Role;
  body: string;
  createdAt: string;
}

export interface ClinicalNote {
  id: string;
  memberId: string;
  clinicianId: string;
  body: string;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  memberId: string;
  approvalId?: string;
  dueDate: string;
  reason: string;
  status: 'SCHEDULED' | 'COMPLETED';
  createdBy: string;
  createdAt: string;
  completedBy?: string;
  completedAt?: string;
  outcome?: string;
}

export interface NotificationRecord {
  id: string;
  memberId: string;
  kind: 'REMINDER' | 'DECISION' | 'MESSAGE' | 'ORDER' | 'CONSENT' | 'GENERAL';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export const REQUIRED_CONSENTS = ['PRIVACY', 'TERMS', 'HEALTH_DATA', 'CLINICAL_SERVICE'] as const;
export const OPTIONAL_CONSENTS = ['COMMUNICATIONS', 'MARKETING'] as const;
export type ConsentType = (typeof REQUIRED_CONSENTS)[number] | (typeof OPTIONAL_CONSENTS)[number];
/** Placeholder until legal-approved consent wording exists. */
export const CONSENT_VERSION = 'draft-unapproved-0';

export interface Consent {
  id: string;
  memberId: string;
  type: ConsentType;
  granted: boolean;
  version: string;
  recordedAt: string;
  withdrawnAt?: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorRole: Role;
  action: string;
  memberId?: string;
  targets: string[];
  at: string;
}

export interface CorporateAccount {
  id: string;
  name: string;
  adminIds: string[];
  enrolledMembers: number;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  at: string;
}

export interface InventoryRecord {
  id: string;
  sku: string;
  treatmentId: string;
  onHand: number;
  reserved: number;
  updatedAt: string;
}

export interface CollectionTypes {
  users: UserRecord;
  members: MemberRecord;
  memberGoals: MemberGoal;
  healthAssessments: HealthAssessment;
  medicalHistories: MedicalHistory;
  lifestyleProfiles: LifestyleProfile;
  nutritionProfiles: NutritionProfile;
  measurements: Measurement;
  biomarkerDefinitions: BiomarkerDefinition;
  biomarkerResults: BiomarkerResult;
  dnaTests: DnaTest;
  dnaInsights: DnaInsight;
  documents: DocumentRecord;
  treatments: Treatment;
  treatmentRequests: TreatmentRequest;
  approvedTreatments: ApprovedTreatment;
  regimens: Regimen;
  reminders: Reminder;
  adherenceEvents: AdherenceEvent;
  orders: Order;
  orderItems: OrderItem;
  payments: Payment;
  shipments: Shipment;
  careTeams: CareTeam;
  providerAssignments: ProviderAssignment;
  messages: Message;
  messageThreads: MessageThread;
  clinicalNotes: ClinicalNote;
  followUps: FollowUp;
  notifications: NotificationRecord;
  consents: Consent;
  auditEvents: AuditEvent;
  corporateAccounts: CorporateAccount;
  analyticsEvents: AnalyticsEvent;
  operationalProfiles: OperationalProfile;
  inventory: InventoryRecord;
}

export type Store = { [K in CollectionName]: Record<string, CollectionTypes[K]> };

export function emptyStore(): Store {
  return Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as Store;
}

export interface Actor {
  uid: string;
  role: Role;
}

// ---------------------------------------------------------------------------
// Dates (South African local dates; SA has no daylight saving)
// ---------------------------------------------------------------------------

const localDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: SERVICE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const localTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: SERVICE_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** YYYY-MM-DD in Africa/Johannesburg. */
export function localDate(now: Date): string {
  return localDateFormat.format(now);
}

/** HH:MM in Africa/Johannesburg. */
export function localTime(now: Date): string {
  return localTimeFormat.format(now);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Whole days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Completed years of age on `onDate`. */
export function ageOn(dateOfBirth: string, onDate: string): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

/** Instant at which a local SA date + HH:MM occurs. */
export function localDateTimeToInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+02:00`);
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export function isScheduledOn(regimen: Pick<Regimen, 'schedule' | 'startDate' | 'endDate'>, date: string): boolean {
  if (date < regimen.startDate || date > regimen.endDate) return false;
  const s = regimen.schedule;
  switch (s.kind) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return weekday(date) === s.weekday;
    case 'WEEKDAYS':
      return s.weekdays.includes(weekday(date));
    case 'EVERY_N_DAYS':
      return daysBetween(regimen.startDate, date) % s.interval === 0;
    case 'CUSTOM':
      return s.dates.includes(date);
  }
}

/** Scheduled dates in [from, to], inclusive, capped for safety. */
export function scheduledDates(
  regimen: Pick<Regimen, 'schedule' | 'startDate' | 'endDate'>,
  from: string,
  to: string,
  limit = 400,
): string[] {
  const out: string[] = [];
  let d = from < regimen.startDate ? regimen.startDate : from;
  const end = to > regimen.endDate ? regimen.endDate : to;
  while (d <= end && out.length < limit) {
    if (isScheduledOn(regimen, d)) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

export function nextScheduledDate(
  regimen: Pick<Regimen, 'schedule' | 'startDate' | 'endDate'>,
  from: string,
): string | undefined {
  return scheduledDates(regimen, from, regimen.endDate, 1)[0];
}

export function describeSchedule(s: Schedule): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (s.kind) {
    case 'DAILY':
      return 'Every day';
    case 'WEEKLY':
      return `Weekly on ${names[s.weekday]}`;
    case 'WEEKDAYS':
      return `On ${s.weekdays.map((w) => names[w]).join(', ')}`;
    case 'EVERY_N_DAYS':
      return `Every ${s.interval} days`;
    case 'CUSTOM':
      return `On ${s.dates.length} set date${s.dates.length === 1 ? '' : 's'}`;
  }
}

export function isApprovalCurrent(approval: ApprovedTreatment, today: string): boolean {
  return approval.status === 'ACTIVE' && today >= approval.startDate && today <= approval.expiresOn;
}

// ---------------------------------------------------------------------------
// Reminder decision (pure; used by the scheduled function and tests)
// ---------------------------------------------------------------------------

export type ReminderDecision =
  | { send: false; reason: string }
  | { send: true; dueDate: string; notificationId: string };

export function reminderDecision(input: {
  reminder: Reminder;
  approval?: ApprovedTreatment;
  regimen?: Regimen;
  adherence: AdherenceEvent[];
  now: Date;
}): ReminderDecision {
  const { reminder, approval, regimen, adherence, now } = input;
  const today = localDate(now);
  if (!reminder.active) return { send: false, reason: 'reminder inactive' };
  if (!approval || !isApprovalCurrent(approval, today)) return { send: false, reason: 'no current approval' };
  if (!regimen || !regimen.active) return { send: false, reason: 'no active regimen' };
  if (!isScheduledOn(regimen, today)) return { send: false, reason: 'not scheduled today' };
  if (localTime(now) < reminder.time) return { send: false, reason: 'not yet time' };
  const forToday = adherence.filter((e) => e.approvalId === approval.id && e.dueDate === today);
  if (forToday.some((e) => e.action === 'TAKEN' || e.action === 'MISSED')) {
    return { send: false, reason: 'already recorded' };
  }
  const snoozes = forToday.filter((e) => e.action === 'SNOOZED').sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const lastSnooze = snoozes.at(-1);
  if (lastSnooze?.snoozeUntil && lastSnooze.snoozeUntil > now.toISOString()) {
    return { send: false, reason: 'snoozed' };
  }
  // Deterministic id: one reminder per due date, plus one per elapsed snooze.
  const notificationId = `rem_${reminder.id}_${today}${snoozes.length ? `_s${snoozes.length}` : ''}`;
  return { send: true, dueDate: today, notificationId };
}

// ---------------------------------------------------------------------------
// Visibility projection
// ---------------------------------------------------------------------------

/** Order statuses fulfilment needs to see for dispatch. */
export const FULFILMENT_ORDER_STATUSES: readonly OrderStatus[] = ['PAID', 'PREPARING', 'DISPENSED', 'SHIPPED'];

function filterRecords<K extends CollectionName>(
  store: Store,
  name: K,
  keep: (r: CollectionTypes[K]) => boolean,
): Record<string, CollectionTypes[K]> {
  const out: Record<string, CollectionTypes[K]> = {};
  for (const [id, r] of Object.entries(store[name])) if (keep(r)) out[id] = r;
  return out;
}

function mapRecords<T, R>(records: Record<string, T>, fn: (r: T) => R): Record<string, R> {
  return Object.fromEntries(Object.entries(records).map(([id, r]) => [id, fn(r)]));
}

export function activeAssignedMemberIds(store: Store, clinicianId: string): Set<string> {
  return new Set(
    Object.values(store.providerAssignments)
      .filter((a) => a.active && a.clinicianId === clinicianId)
      .map((a) => a.memberId),
  );
}

/**
 * Role-scoped projection applied to every workspace response. It is a second
 * line of defence: the Firebase loader already limits what it reads.
 */
export function visible(store: Store, actor: Actor): Store {
  const out = emptyStore();
  const publicTreatments = filterRecords(store, 'treatments', (t) => t.active && t.public);

  switch (actor.role) {
    case 'MEMBER': {
      const own = (r: { memberId: string }) => r.memberId === actor.uid;
      for (const c of MEMBER_COLLECTIONS) {
        if (c === 'clinicalNotes' || c === 'operationalProfiles' || c === 'providerAssignments') continue;
        (out as Record<string, unknown>)[c] = filterRecords(store, c, own as never);
      }
      out.treatments = publicTreatments;
      // Members also see treatments they hold an approval or request for.
      const related = new Set([
        ...Object.values(out.approvedTreatments).map((a) => a.treatmentId),
        ...Object.values(out.treatmentRequests).map((r) => r.treatmentId),
      ]);
      for (const t of Object.values(store.treatments)) if (related.has(t.id)) out.treatments[t.id] = t;
      out.biomarkerDefinitions = { ...store.biomarkerDefinitions };
      out.users = filterRecords(store, 'users', (u) => u.id === actor.uid);
      return out;
    }
    case 'CLINICIAN': {
      const assigned = activeAssignedMemberIds(store, actor.uid);
      const mine = (r: { memberId: string }) => assigned.has(r.memberId);
      for (const c of MEMBER_COLLECTIONS) {
        if (c === 'operationalProfiles') continue;
        (out as Record<string, unknown>)[c] = filterRecords(store, c, mine as never);
      }
      out.providerAssignments = filterRecords(store, 'providerAssignments', (a) => a.clinicianId === actor.uid);
      out.payments = {};
      out.treatments = { ...store.treatments };
      out.biomarkerDefinitions = { ...store.biomarkerDefinitions };
      out.users = filterRecords(store, 'users', (u) => u.id === actor.uid);
      return out;
    }
    case 'OPERATIONS': {
      out.operationalProfiles = { ...store.operationalProfiles };
      out.orders = { ...store.orders };
      out.orderItems = { ...store.orderItems };
      out.payments = { ...store.payments };
      out.shipments = { ...store.shipments };
      out.inventory = { ...store.inventory };
      out.treatments = { ...store.treatments };
      out.messageThreads = filterRecords(store, 'messageThreads', (t) => OPERATIONS_TOPICS.includes(t.topic));
      out.messages = filterRecords(store, 'messages', (m) => OPERATIONS_TOPICS.includes(m.topic));
      // Scheduling metadata only; clinical outcomes stay with clinicians.
      out.followUps = mapRecords(store.followUps, ({ outcome: _outcome, ...f }) => f as FollowUp);
      out.users = filterRecords(store, 'users', (u) => u.id === actor.uid);
      return out;
    }
    case 'FULFILMENT': {
      out.orders = filterRecords(
        store,
        'orders',
        (o) => FULFILMENT_ORDER_STATUSES.includes(o.status) || o.status === 'DELIVERED',
      );
      const ids = new Set(Object.keys(out.orders));
      out.orderItems = filterRecords(store, 'orderItems', (i) => ids.has(i.orderId));
      out.shipments = filterRecords(store, 'shipments', (s) => ids.has(s.orderId));
      out.inventory = { ...store.inventory };
      out.treatments = { ...store.treatments };
      out.users = filterRecords(store, 'users', (u) => u.id === actor.uid);
      return out;
    }
    case 'SUPER_ADMIN': {
      out.treatments = { ...store.treatments };
      out.inventory = { ...store.inventory };
      out.operationalProfiles = { ...store.operationalProfiles };
      out.auditEvents = { ...store.auditEvents };
      out.biomarkerDefinitions = { ...store.biomarkerDefinitions };
      out.careTeams = { ...store.careTeams };
      out.corporateAccounts = { ...store.corporateAccounts };
      out.users = { ...store.users };
      return out;
    }
    case 'CORPORATE_ADMIN': {
      out.corporateAccounts = filterRecords(store, 'corporateAccounts', (a) => a.adminIds.includes(actor.uid));
      out.treatments = publicTreatments;
      out.users = filterRecords(store, 'users', (u) => u.id === actor.uid);
      return out;
    }
  }
}

export function formatRand(cents: number): string {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
