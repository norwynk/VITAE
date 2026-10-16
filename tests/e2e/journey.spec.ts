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
  await expect(page.getByRole('heading', { name: /Not all pricks\s*are created equal\./i })).toBeVisible();
  await expect(page.getByText("Pens shown are fictional demo products and can't be bought yet.")).toBeVisible();
  for (const name of ['Total Body Reset', 'Craving Control', 'Body Sculpt', 'The Glow Up', 'Skin Rewind', 'Skin Rewind Reserve']) {
    await expect(page.getByRole('heading', { name, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Meet all 17' })).toBeVisible();
  await expect(page.getByText('Designed for women.').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /A prick that\s*gets her\./ })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Dr Kylee Montgomerie' })).toBeVisible();
  await expect(page.getByText('We started PRICK to help women grow into their best selves.', { exact: false })).toBeVisible();
  await expect(page.getByText('– Dr Kylee Montgomerie, Co-Founder of PRICK')).toBeVisible();
  await expect(page.locator('.founder-quote__hand')).toContainText('Dr Kylee,');
  await expect(page.locator('.founder-quote').getByRole('link', { name: 'About us' })).toHaveAttribute('href', '/about');
  await expect(page.getByText('Built around your goals, your body and your rhythm.')).toBeVisible();
  await expect(page.getByText('around her goals', { exact: false })).toHaveCount(0);
  await expect(page.locator('#how-it-works').getByRole('link', { name: 'Start your screening' })).toHaveAttribute('href', '/start');
  await expect(page.locator('.marquee').getByText('Months of doses in one pen').first()).toBeAttached();
  for (const gone of ['Fun to pick', 'fits in a bag', 'Small pen', 'Clinician-checked']) {
    await expect(page.getByText(gone, { exact: false })).toHaveCount(0);
  }
  const goodDays = page.locator('section', { has: page.getByRole('heading', { name: 'This prick gets around.' }) });
  await expect(goodDays.getByText('you use it privately at home', { exact: false })).toBeVisible();
  await expect(goodDays.getByRole('link', { name: 'Find your Prick' })).toHaveAttribute('href', '/find-your-prick');
  await expect(page.getByText('Co-founded by', { exact: false })).toHaveCount(0);
  for (const gone of ['Made by women', "Everyone's welcome", "founder's story", 'what you want to change']) {
    await expect(page.getByText(gone, { exact: false })).toHaveCount(0);
  }
  await expect(page.getByText('A clinician says yes. Or no.')).toBeVisible();
  await expect(page.getByRole('heading', { name: "Don't take pricks from strangers." })).toBeVisible();
  const card = page.getByRole('article', { name: 'Craving Control' });
  await expect(card.getByText('Stop letting food take up so much space in your head.')).toBeVisible();
  const feeling = card.getByText('Quieter. Calmer. Less preoccupied.');
  await expect(feeling).toBeHidden();
  await card.getByRole('button', { name: 'What you get' }).click();
  await expect(feeling).toBeVisible();
  await expect(card.getByText('Transformation')).toBeVisible();
  await expect(card.locator('[data-needs-verification="benefits"]')).toBeVisible();
  await expect(card.getByText('A feeling, not a medical claim.', { exact: false })).toBeVisible();
  await card.getByRole('button', { name: 'Flip back' }).click();
  await expect(feeling).toBeHidden();
  // Placeholders, never invented testimonials.
  await expect(page.getByText('Real reviews from real members will live here.').first()).toBeVisible();
});

test('shop filters by category and the expanded view keeps the clinical gate', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.getByRole('button', { name: 'All (17)' })).toBeVisible();
  await page.getByRole('button', { name: 'Weight & Body' }).click();
  for (const name of ['Total Body Reset', 'Slow & Steady', 'Momentum']) await expect(page.getByRole('article', { name })).toBeVisible();
  await page.getByRole('article', { name: 'Slow & Steady' }).getByRole('link', { name: 'View the pen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Slow & Steady' })).toBeVisible();
  await expect(page.getByText(/This is Ozempic®: a once-a-week injection/)).toBeVisible();
  await expect(page.getByText('Ozempic®', { exact: true })).toBeVisible();
  await expect(page.getByText('Semaglutide', { exact: true })).toBeVisible();
  await page.goto('/shop');
  await page.getByRole('button', { name: 'Energy, Sleep & Recovery' }).click();
  await expect(page.getByRole('article', { name: 'Deep Sleep Rebuild' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'The Glow Up' })).toHaveCount(0);
  await page.getByRole('article', { name: 'Deep Sleep Rebuild' }).getByRole('link', { name: 'View the pen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Deep Sleep Rebuild' })).toBeVisible();
  for (const section of ["What's actually in it", 'A prick with paperwork.', "Don't take pricks from strangers.", "We don't mess around with this part.", "Let's get to know each other first."]) {
    await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
  await expect(page.getByText('CJC-1295 without DAC + Ipamorelin', { exact: true })).toBeVisible();
  await expect(page.getByText('A higher number on a pen does not mean it works better.')).toBeVisible();
  await expect(page.getByText('It is not a medical claim or a promise.', { exact: false })).toBeVisible();
  await expect(page.locator('[data-coa="pending"]')).toBeVisible();
  // Evidence, reviewer notes and clinical detail stay in the back end.
  for (const hidden of ['The clinical bit', 'What the evidence supports', 'Verification status', 'Reviewer note', 'Approval status']) {
    await expect(page.getByText(hidden, { exact: false })).toHaveCount(0);
  }

  // A stack name is never shown as an ingredient.
  await page.goto('/pens/the-glow-up');
  const ingredient = page.locator('[data-needs-verification="activeIngredient"]');
  await expect(ingredient).toBeVisible();
  await expect(ingredient).toContainText('has not disclosed the individual actives');
  await page.goto('/pens/deep-sleep-rebuild');
  await expect(page.getByText('You can only get it if your clinician approves it for you.')).toBeVisible();
  await expect(page.getByRole('button', { name: /add to cart|buy now/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Start screening' }).first()).toHaveAttribute('href', '/start?pen=deep-sleep-rebuild');
});

test('goal cards come first and open the quiz with that goal chosen', async ({ page }) => {
  await page.goto('/');
  const goals = page.locator('section', { has: page.getByRole('heading', { name: /What are\s*you after\?/ }) });
  for (const title of ['Lose the weight.', 'Get the glow.', 'Sleep. Recover. Repeat.', 'Feel like you again.']) {
    await expect(goals.getByText(title, { exact: true })).toBeVisible();
  }
  // Goal cards sit above "Meet the pricks".
  const goalsTop = (await goals.boundingBox())!.y;
  const rangeTop = (await page.getByRole('heading', { name: /Meet the\s*pricks\./ }).boundingBox())!.y;
  expect(goalsTop).toBeLessThan(rangeTop);
  await goals.getByRole('link', { name: /Get the glow\./ }).click();
  await expect(page).toHaveURL(/\/find-your-prick\?goal=skin$/);
  await expect(page.getByText(/· Appearance & Skin/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Which sounds\s*most like you\?/ })).toBeVisible();
  // An unknown goal falls back to the normal start.
  await page.goto('/find-your-prick?goal=nonsense');
  await expect(page.getByRole('heading', { name: /Have you met\s*your prick\?/ })).toBeVisible();
});

test('quiz asks enough to match, and matches build "My pens"', async ({ page }) => {
  await page.goto('/find-your-prick');
  await page.getByRole('button', { name: "Let's go" }).click();
  await page.getByRole('button', { name: 'I want more energy, sleep or recovery' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Still have something left/ }).click();
  await page.getByRole('button', { name: 'Switched on' }).click();
  await page.getByRole('button', { name: 'Still going' }).click();
  await page.getByRole('button', { name: 'Show my match' }).click();
  await expect(page.getByRole('heading', { name: /Your match:\s*All-Day Energy\./ })).toBeVisible();
  await expect(page.getByText(/Looks like you're/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'I want to love what I see' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Look as good as you want to feel.' }).click();
  await page.getByRole('button', { name: 'Skip and show my match' }).click();
  await expect(page.getByRole('heading', { name: /Your match:\s*The Glow Up\./ })).toBeVisible();
  await expect(page.getByText('Also worth asking your clinician about')).toBeVisible();
  await page.getByRole('button', { name: 'Add The Glow Up to my pens' }).click();

  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'I want more energy, sleep or recovery' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Make your nights count again.' }).click();
  await page.getByRole('button', { name: 'Rested' }).click();
  await page.getByRole('button', { name: 'Show my match' }).click();
  await expect(page.getByRole('heading', { name: /Your match:\s*Deep Sleep Rebuild\./ })).toBeVisible();
  await expect(page.getByText('This is a match, not a prescription.')).toBeVisible();
  await page.getByRole('button', { name: 'Add Deep Sleep Rebuild to my pens' }).click();
  // Adding a second pen keeps the first.
  await expect(page.getByRole('link', { name: 'My pens (2)' }).first()).toBeAttached();

  // The questionnaire comes first, before any account, with the chosen pens.
  await page.getByRole('link', { name: 'Start your screening' }).click();
  await expect(page).toHaveURL(/\/start\?pen=deep-sleep-rebuild$/);
  await expect(page.getByRole('heading', { name: /The fun part is picking it/ })).toBeVisible();
  await expect(page.locator('.screening__pen')).toHaveCount(2);
});

test('full journey across roles', async ({ page }) => {
  page.on('dialog', (d) => void d.accept(d.type() === 'prompt' ? 'DEMO-COURIER-1' : undefined));

  // --- Questionnaire first, no account yet --------------------------------------
  const pick = (q: string, option: string) => page.locator(`[data-q="${q}"]`).getByRole('button', { name: option, exact: true }).or(page.locator(`[data-q="${q}"]`).getByRole('radio', { name: option, exact: true })).click();
  const next = () => page.getByRole('button', { name: /^(Next|See where I stand)$/ }).click();
  await page.goto('/start');
  await next();
  await expect(page.getByText('Choose at least one pen, or let your clinician suggest one.')).toBeVisible();
  await page.getByLabel('Choose a pen').selectOption({ label: 'Total Body Reset' });
  await next();
  await expect(page.getByRole('heading', { name: 'Let’s get to know each other first.' })).toBeVisible();
  await page.getByLabel('First name').fill('Alex');
  await page.getByLabel('Date of birth').fill('1990-01-15');
  await pick('sex', 'Female');
  await page.getByLabel('Province').selectOption('Western Cape');
  await page.getByLabel('City or town').fill('Cape Town');
  await page.getByLabel('Height (cm)').fill('175');
  await page.getByLabel('Weight (kg)').fill('82');
  await next();
  // Saved on this device: leaving part-way loses nothing.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'So, what brings you to us?' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel('First name')).toHaveValue('Alex');
  await next();
  await pick('goals', 'Energy');
  await page.getByLabel(/What made you reach out\?/).fill('I want my energy back.');
  await next();
  // Health lists need an answer, even if that answer is "none".
  await next();
  await expect(page.getByText(/Health conditions: add something, or tick/)).toBeVisible();
  await pick('conditions', 'Migraines');
  await page.locator('[data-q="allergies"]').getByLabel('I have no allergies').check();
  await page.getByLabel('Name, row 1').fill('Vitamin D');
  await pick('previousPeptides', 'No');
  await page.locator('[data-q="familyHistory"]').getByLabel('Nothing I know of').check();
  // Questions for the chosen weight pen; a family-history "Not sure" is flagged for the clinician.
  await expect(page.getByText('For your weight medicine')).toBeVisible();
  await pick('pen:glp1-thyroid', 'Not sure');
  await pick('pen:glp1-current', 'No');
  await page.locator('[data-q="pen:weight-goal"] input').fill('75');
  await next();
  await pick('smoking', 'No');
  await pick('alcohol', 'Socially');
  await page.getByLabel(/how many drinks a week/).fill('2');
  await pick('activity', 'Moderate');
  await next();
  await page.getByLabel(/Hours of sleep a night/).fill('7');
  await next();
  await expect(page.getByRole('heading', { name: 'Your body, your cycle.' })).toBeVisible();
  await pick('pregnant', 'No');
  await pick('breastfeeding', 'No');
  await pick('planningPregnancy', 'Yes');
  await pick('menopauseStage', 'Before menopause');
  await next();
  await expect(page.getByRole('heading', { name: 'Head space.' })).toBeVisible();
  await next();
  await expect(page.getByRole('heading', { name: 'The bedroom bit.' })).toBeVisible();
  await next();
  // The good-fit moment reads the answers honestly, then: create an account.
  await expect(page.getByRole('heading', { name: /Thanks for being so open/ })).toBeVisible();
  await expect(page.getByText('Your clinician reads every answer.')).toBeVisible();
  await page.getByRole('button', { name: 'Create my account' }).click();

  // --- Account created: last details, then send -----------------------------------
  await expect(page.getByRole('heading', { name: /Nearly there, Alex\./ })).toBeVisible();
  await page.getByLabel('Last name').fill('Newby');
  await page.getByLabel('ID number').fill('9001155000080');
  await page.getByLabel('Mobile number').fill('+27 82 000 0000');
  await page.getByLabel(/privacy notice/).check();
  await page.getByLabel(/terms of use/).check();
  await page.getByLabel(/health information being processed/).check();
  await page.getByLabel(/clinician decides/).check();
  await page.getByRole('button', { name: 'Send it to my clinician' }).click();
  await expect(page.getByText('Hey, Alex.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your clinician is on it.' })).toBeVisible();

  // --- The chosen pen went to the clinician; save address; nothing orderable yet --
  const myPens = page.locator('section', { has: page.getByRole('heading', { name: 'My pens' }) });
  await expect(myPens.getByText('Total Body Reset')).toBeVisible();
  await expect(myPens.getByText('Waiting for your clinician')).toBeVisible();

  await page.getByRole('tab', { name: 'Orders' }).click();
  await page.getByLabel('Recipient').fill('Alex Newby');
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
  await page.getByRole('button', { name: /Alex Newby/ }).click();
  const penAnswers = page.locator('section', { has: page.getByRole('heading', { name: 'Pen-specific answers' }) });
  await expect(penAnswers.getByText('Look at this')).toHaveCount(1);
  await expect(penAnswers.getByText(/medullary thyroid cancer/)).toBeVisible();
  // The full questionnaire, in the words the member was asked.
  const questionnaire = page.locator('section', { has: page.getByRole('heading', { name: 'Questionnaire' }) });
  await expect(questionnaire.getByText('I want my energy back.')).toBeVisible();
  await expect(questionnaire.getByText('Vitamin D')).toBeVisible();
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
  await expect(page.getByRole('heading', { name: "Today's dose." })).toBeVisible();
  await page.getByRole('button', { name: 'Log it' }).click();
  await page.getByRole('button', { name: 'Taken' }).click();
  await expectToast(page, 'Dose recorded as taken');
  await expect(page.getByText(/Nothing to record/)).toBeVisible();

  await page.getByRole('tab', { name: 'Orders' }).click();
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

  // --- On repeat after the first pen; stopping offers a pause first ---------------
  const repeat = page.locator('section', { has: page.getByRole('heading', { name: 'On repeat' }) });
  await repeat.getByRole('button', { name: 'Put on repeat' }).click();
  await expectToast(page, 'Total Body Reset is on repeat');
  await expect(repeat.getByText(/Your check-in opens on/)).toBeVisible();
  await repeat.getByRole('button', { name: 'Stop repeat' }).click();
  await expect(repeat.getByText('Would a pause help instead?')).toBeVisible();
  await repeat.getByRole('button', { name: 'Pause instead' }).click();
  await expectToast(page, 'Repeat paused');
  await repeat.getByRole('button', { name: 'Resume' }).click();
  await expectToast(page, 'Repeat resumed');

  // --- Member asks for support ---------------------------------------------------
  await page.getByRole('tab', { name: 'Plan' }).click();
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
  await page.getByRole('button', { name: /Alex Newby/ }).click();
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
  await expect(page.getByText('Hey, Sam.')).toBeVisible();
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'My pens' }) }).getByText('Approved').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Plan' }).click();
  await expect(page.getByText(/Every day · valid until/)).toBeVisible();
  // Total Body Reset was made purchasable in the journey above, but Sam has no saved address yet.
  await page.getByRole('tab', { name: 'Orders' }).click();
  await expect(page.getByText('Save a delivery address before ordering.')).toBeVisible();
});

test('about page tells the founders story', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: 'Behind PRICK.' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Dr Kylee Montgomerie and Norwyn K, co-founders of PRICK' })).toBeVisible();
  await expect(page.getByText('Start with the person, not the peptide.')).toBeVisible();
  await expect(page.getByText('Serious where it matters.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start your screening' })).toHaveAttribute('href', '/start');
});

// Runs last: it wipes the shared demo store.
test('reset clears the demo and this browser, and a vanished account starts afresh', async ({ page, browser }) => {
  page.on('dialog', (d) => void d.accept());
  const demo = (body: object) =>
    page.evaluate((b) => fetch('/api/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.status), body);

  // A visitor picks pens and starts the questionnaire.
  await page.goto('/pens/the-glow-up');
  await page.getByRole('button', { name: 'Add The Glow Up to my pens' }).first().click();
  await expect(page.getByRole('link', { name: 'My pens (1)' }).first()).toBeAttached();
  await page.evaluate(() => localStorage.setItem('prick:screening', JSON.stringify({ answers: { firstName: 'Test' }, penAnswers: {}, letClinicianSuggest: false, step: 2 })));

  // Reset clears the server, the session and this browser.
  await page.goto('/app');
  await page.getByRole('button', { name: 'Established member' }).click();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByRole('heading', { name: /Welcome in\./ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account' }).first()).toBeAttached();
  expect(await page.evaluate(() => [localStorage.getItem('prick:shortlist'), localStorage.getItem('prick:screening')])).toEqual(['[]', null]);
  // New members start with the questionnaire.
  await page.getByRole('button', { name: 'New member: start the questionnaire' }).click();
  await expect(page).toHaveURL(/\/start$/);

  // A sign-up whose account disappears (reset elsewhere, or the demo server restarted) gets a clean start.
  expect(await demo({ action: 'session', role: 'MEMBER', persona: 'signup' })).toBe(200);
  const other = await browser.newPage();
  await other.goto('/app');
  await other.evaluate(async () => {
    const post = (b: object) => fetch('/api/demo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
    await post({ action: 'session', role: 'SUPER_ADMIN' });
    await post({ action: 'reset' });
  });
  await other.close();
  await page.goto('/app');
  await expect(page.getByText('That demo account no longer exists.', { exact: false })).toBeVisible();
  await expect(page.getByText('Your member record could not be found.')).toHaveCount(0);
});
