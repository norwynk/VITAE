import { type Page, expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function switchRole(page: Page, label: string) {
  await page.getByLabel('Demo role').selectOption({ label });
  await expect(page.getByLabel('Demo role').locator('option:checked')).toHaveText(label);
}

async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('.toast')).toContainText(text);
}

test('home shows colour cards that flip to outcome, feeling and transformation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Pick your\s*Prick\./i })).toBeVisible();
  await expect(page.getByText("Pens shown are fictional demo products and can't be bought yet.")).toBeVisible();
  for (const name of ['Total Body Reset', 'Craving Control', 'Body Sculpt', 'The Glow Up', 'Skin Rewind', 'Skin Rewind Reserve']) {
    await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'See all 15 pens' })).toBeVisible();
  const card = page.getByRole('article', { name: 'Craving Control' });
  await expect(card.getByText('Stop letting food take up so much space in your head.')).toBeVisible();
  const feeling = card.getByText('Quieter. Calmer. Less preoccupied.');
  await expect(feeling).toBeHidden();
  await card.getByRole('button', { name: 'What you get' }).click();
  await expect(feeling).toBeVisible();
  await expect(card.getByText('Transformation')).toBeVisible();
  await card.getByRole('button', { name: 'Flip back' }).click();
  await expect(feeling).toBeHidden();
  // Placeholders, never invented testimonials.
  await expect(page.getByText('Real reviews from real members will live here.').first()).toBeVisible();
});

test('shop filters by category and the expanded view keeps the clinical gate', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.getByRole('button', { name: 'All (15)' })).toBeVisible();
  await page.getByRole('button', { name: 'Energy, Sleep & Recovery' }).click();
  await expect(page.getByRole('article', { name: 'Deep Sleep Rebuild' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'The Glow Up' })).toHaveCount(0);
  await page.getByRole('article', { name: 'Deep Sleep Rebuild' }).getByRole('link', { name: 'View the pen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Deep Sleep Rebuild' })).toBeVisible();
  for (const section of ['What it actually is', 'Peptide / stack', 'Verified clinical information', 'Eligibility', 'Screening', 'Safety', 'How the process works']) {
    await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
  await expect(page.getByText('CJC-1295 + Ipamorelin')).toBeVisible();
  await expect(page.getByText(/Not yet verified\. Clinical information for Deep Sleep Rebuild/)).toBeVisible();
  await expect(page.getByText('You can only order it if your clinician approves it for you.')).toBeVisible();
  await expect(page.getByRole('button', { name: /add to cart|buy now/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Start screening' }).first()).toHaveAttribute('href', '/app?pen=deep-sleep-rebuild');
});

test('quiz match leads into screening for the matched pen', async ({ page }) => {
  await page.goto('/find-your-prick');
  await page.getByRole('button', { name: "Let's go" }).click();
  await page.getByRole('button', { name: 'I want more energy, sleep or recovery' }).click();
  await page.getByRole('button', { name: 'Switched on. Capable. Still going.' }).click();
  await expect(page.getByRole('heading', { name: /Looks like you're an All-Day Energy\./i })).toBeVisible();
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'I want to love what I see' }).click();
  await page.getByRole('button', { name: 'Radiant. Fresh. Confident.' }).click();
  await expect(page.getByRole('heading', { name: /Looks like you're The Glow Up\./i })).toBeVisible();
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'I want more energy, sleep or recovery' }).click();
  await page.getByRole('button', { name: 'Rested. Rebuilt. Clearer.' }).click();
  await expect(page.getByRole('heading', { name: /Looks like you're a Deep Sleep Rebuild/i })).toBeVisible();
  await expect(page.getByText('This is a match, not a prescription.')).toBeVisible();
  await page.getByRole('link', { name: 'Start your screening' }).click();
  await page.getByRole('button', { name: 'New member' }).click();
  await expect(page.getByText('Health screening · Deep Sleep Rebuild')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin screening' })).toBeVisible();
});

test('full journey across roles', async ({ page }) => {
  page.on('dialog', (d) => void d.accept(d.type() === 'prompt' ? 'DEMO-COURIER-1' : undefined));

  // --- New member onboarding ---------------------------------------------------
  await page.goto('/app');
  // Earlier tests may have left a demo session; this context starts clean.
  await page.getByRole('button', { name: 'New member' }).click();
  await page.getByRole('button', { name: 'Begin screening' }).click();
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
  await expect(page.getByRole('heading', { name: /Hey, Alex\./ })).toBeVisible();

  // --- Request, save address; nothing orderable yet -----------------------------
  const metabolicCard = page.locator('li.card', { hasText: 'Total Body Reset' });
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
  // Every pen needs an approval, so nothing is orderable yet.
  await expect(ordering.getByText('Nothing is available to order')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your orders' })).toHaveCount(0);

  // --- Clinician approves --------------------------------------------------------
  await switchRole(page, 'Clinician');
  await expect(page.getByRole('heading', { name: 'Clinician workspace' })).toBeVisible();
  await page.getByRole('button', { name: /Alex Demo/ }).click();
  const review = page.getByRole('form', { name: /Review Total Body Reset/ });
  await review.getByLabel('Packs approved').fill('2');
  await review.getByLabel('Frequency').selectOption('DAILY');
  await review.getByLabel('Decision note').fill('Suitable for the fictional demo plan.');
  await review.getByRole('button', { name: 'Record decision' }).click();
  await expectToast(page, 'Decision recorded: Approved');
  await expect(page.getByText(/2\/2 packs left/)).toBeVisible();

  // --- Super admin: verification gate, then demo catalogue setup -----------------
  await switchRole(page, 'Super admin');
  const recovery = page.getByRole('form', { name: /Edit The Glow Up/ });
  await recovery.getByLabel('Purchasable').check();
  await recovery.getByRole('button', { name: /^Save/ }).click();
  await expectToast(page, /regulatorily verified/);

  const metabolic = page.getByRole('form', { name: /Edit Total Body Reset/ });
  await metabolic.getByLabel('Regulatory status').selectOption('VERIFIED');
  await metabolic.getByLabel('Registration reference').fill('DEMO-REG-0001');
  await metabolic.getByLabel('Purchasable').check();
  await metabolic.getByRole('button', { name: /^Save/ }).click();
  await expectToast(page, /updated/);
  await expect(page.getByRole('form', { name: /Edit Total Body Reset/ }).locator('.badge', { hasText: /^Purchasable$/ })).toBeVisible();

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
  await expect(page.getByRole('heading', { name: /Hey, Sam\./ })).toBeVisible();
  await expect(page.getByText("Here's your prick.")).toBeVisible();
  await expect(page.getByText(/Every day · valid until/)).toBeVisible();
  // Total Body Reset was made purchasable in the journey above, but Sam has no saved address yet.
  await expect(page.getByText('Save a delivery address before ordering.')).toBeVisible();
});
