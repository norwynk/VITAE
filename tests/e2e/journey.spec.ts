import { type Page, expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function switchRole(page: Page, label: string) {
  await page.getByLabel('Demo role').selectOption({ label });
  await expect(page.getByLabel('Demo role').locator('option:checked')).toHaveText(label);
}

async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('.toast')).toContainText(text);
}

test('public pathways are fictional and not orderable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Care that starts with an assessment' })).toBeVisible();
  await expect(page.getByText('Metabolic Support Pen (fictional demo)')).toBeVisible();
  await expect(page.getByText('Fictional demo').first()).toBeVisible();
  await expect(page.getByText('Not available to order.').first()).toBeVisible();
  await expect(page.getByText('nothing here can be bought')).toBeVisible();
});

test('full journey across roles', async ({ page }) => {
  page.on('dialog', (d) => void d.accept(d.type() === 'prompt' ? 'DEMO-COURIER-1' : undefined));

  // --- New member onboarding ---------------------------------------------------
  await page.goto('/app');
  await page.getByRole('button', { name: 'New member' }).click();
  await expect(page.getByRole('heading', { name: 'Your health assessment' })).toBeVisible();
  await page.getByLabel('First name').fill('Alex');
  await page.getByLabel('Last name').fill('Demo');
  await page.getByLabel('Date of birth').fill('1990-01-15');
  await page.getByLabel('ID number').fill('9001155000080');
  await page.getByLabel('Mobile number').fill('+27 82 000 0000');
  await page.getByLabel('Province').selectOption('Western Cape');
  await page.getByLabel('City or town').fill('Cape Town');
  await page.getByLabel('Height (cm)').fill('175');
  await page.getByLabel('Weight (kg)').fill('82');
  await page.getByLabel('Energy').check();
  await page.getByLabel('Average sleep (hours)').fill('7');
  await page.getByLabel(/privacy notice/).check();
  await page.getByLabel(/terms of use/).check();
  await page.getByLabel(/health information being processed/).check();
  await page.getByLabel(/clinician decides/).check();
  await page.getByRole('button', { name: 'Submit assessment' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Alex' })).toBeVisible();

  // --- Request, save address; nothing orderable yet -----------------------------
  const metabolicCard = page.locator('li.card', { hasText: 'Metabolic Support Pen' });
  await metabolicCard.getByRole('button', { name: 'Request clinician review' }).click();
  await expectToast(page, 'Request sent to your clinician');
  await expect(metabolicCard.getByText('Request in review')).toBeVisible();

  await page.getByLabel('Recipient').fill('Alex Demo');
  await page.getByLabel('Street address').fill('1 Example Street');
  await page.getByLabel('Suburb').fill('Gardens');
  await page.getByLabel('City', { exact: true }).fill('Cape Town');
  await page.locator('form', { hasText: 'Save address' }).getByLabel('Province').selectOption('Western Cape');
  await page.getByLabel('Postal code').fill('8001');
  await page.getByLabel('Delivery phone').fill('+27 21 000 0000');
  await page.getByRole('button', { name: 'Save address' }).click();
  await expectToast(page, 'Delivery address saved');
  const ordering = page.locator('section', { has: page.getByRole('heading', { name: 'Order treatment' }) });
  // Only the non-prescription demo pathway is listed, and it is not orderable.
  await expect(ordering.getByText('Sleep Programme (fictional demo)')).toBeVisible();
  await expect(ordering.getByText('This treatment is not available to order yet.')).toBeVisible();
  await expect(ordering.getByText('Metabolic Support Pen')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your orders' })).toHaveCount(0);

  // --- Clinician approves --------------------------------------------------------
  await switchRole(page, 'Clinician');
  await expect(page.getByRole('heading', { name: 'Clinician workspace' })).toBeVisible();
  await page.getByRole('button', { name: /Alex Demo/ }).click();
  const review = page.getByRole('form', { name: /Review Metabolic Support Pen/ });
  await review.getByLabel('Packs approved').fill('2');
  await review.getByLabel('Frequency').selectOption('DAILY');
  await review.getByLabel('Decision note').fill('Suitable for the fictional demo plan.');
  await review.getByRole('button', { name: 'Record decision' }).click();
  await expectToast(page, 'Decision recorded: Approved');
  await expect(page.getByText(/2\/2 packs left/)).toBeVisible();

  // --- Super admin: verification gate, then demo catalogue setup -----------------
  await switchRole(page, 'Super admin');
  const recovery = page.getByRole('form', { name: /Edit Recovery Support Pen/ });
  await recovery.getByLabel('Purchasable').check();
  await recovery.getByRole('button', { name: /^Save/ }).click();
  await expectToast(page, /regulatorily verified/);

  const metabolic = page.getByRole('form', { name: /Edit Metabolic Support Pen/ });
  await metabolic.getByLabel('Regulatory status').selectOption('VERIFIED');
  await metabolic.getByLabel('Registration reference').fill('DEMO-REG-0001');
  await metabolic.getByLabel('Purchasable').check();
  await metabolic.getByRole('button', { name: /^Save/ }).click();
  await expectToast(page, /updated/);
  await expect(page.getByRole('form', { name: /Edit Metabolic Support Pen/ }).locator('.badge', { hasText: /^Purchasable$/ })).toBeVisible();

  // --- Member: adherence and simulated checkout ----------------------------------
  await switchRole(page, 'New member');
  await page.getByRole('button', { name: 'Taken' }).click();
  await expectToast(page, 'Dose recorded as taken');
  await expect(page.getByText(/Nothing to record/)).toBeVisible();

  await expect(page.getByText('Demo mode: payment is simulated')).toBeVisible();
  await page.getByLabel('Quantity').fill('3');
  await page.getByRole('button', { name: 'Place simulated order' }).click();
  // More than the 2 approved packs: blocked in the browser here, and by the server (domain tests).
  expect(await page.getByLabel('Quantity').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  await expect(page.getByRole('heading', { name: 'Your orders' })).toHaveCount(0);
  await page.getByLabel('Quantity').fill('1');
  await page.getByRole('button', { name: 'Place simulated order' }).click();
  await expectToast(page, 'Demo order placed. No money was charged.');
  const orders = page.locator('section', { has: page.getByRole('heading', { name: 'Your orders' }) });
  await expect(orders.getByText('Paid')).toBeVisible();
  await expect(orders.getByText('Simulated')).toBeVisible();

  // --- Member asks for support ---------------------------------------------------
  await page.getByLabel('I need support from my clinician').check();
  await page.getByLabel('Notes').fill('Feeling nauseous after the dose');
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await expectToast(page, 'Your clinician has been alerted');

  // --- Fulfilment dispatches -----------------------------------------------------
  await switchRole(page, 'Fulfilment');
  for (const step of ['Mark preparing', 'Mark dispensed', 'Mark shipped', 'Mark delivered']) {
    await page.getByRole('button', { name: step }).click();
    await expectToast(page, /Order marked/);
  }
  await expect(page.locator('section', { hasText: 'Delivered' }).getByText('DEMO-COURIER-1')).toBeVisible();

  // --- Operations: workflow data only --------------------------------------------
  await switchRole(page, 'Operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Alex D.' })).toBeVisible();
  await expect(page.getByText('Health history')).toHaveCount(0);
  await expect(page.getByText('Feeling nauseous')).toHaveCount(0);
  await expect(page.getByText('Suitable for the fictional demo plan.')).toHaveCount(0);

  // --- Clinician sees the escalation ---------------------------------------------
  await switchRole(page, 'Clinician');
  await expect(page.getByText(/escalated concern/)).toBeVisible();
  await page.getByRole('button', { name: /Alex Demo/ }).click();
  await expect(page.getByText('Feeling nauseous after the dose').first()).toBeVisible();
  await page.getByLabel('New note').fill('Confidential demo note');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expectToast(page, 'Note saved');

  // --- Member never sees the clinical note ---------------------------------------
  await switchRole(page, 'New member');
  await expect(page.getByText('Confidential demo note')).toHaveCount(0);

  // --- Corporate: aggregate only -------------------------------------------------
  await switchRole(page, 'Corporate admin');
  await expect(page.getByText(/Example Employer \(fictional\)/)).toBeVisible();
  await expect(page.getByText('Alex')).toHaveCount(0);
});

test('established member dashboard and blocked checkout', async ({ page }) => {
  await page.goto('/app');
  // Fresh browser context: no demo session yet, so the role picker is shown.
  await page.getByRole('button', { name: 'Established member' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Sam' })).toBeVisible();
  await expect(page.getByText(/Every day · valid until/)).toBeVisible();
  // Metabolic was made purchasable in the journey above, but Sam has no saved address yet.
  await expect(page.getByText('Save a delivery address before ordering.')).toBeVisible();
});
