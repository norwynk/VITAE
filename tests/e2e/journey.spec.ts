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
  for (const name of ['Slow & Steady', 'Craving Control', 'Body Sculpt', 'The Glow Up', 'Skin Rewind', 'Skin Rewind Reserve']) {
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
  // No reviews yet: the heading only, never placeholders or invented testimonials.
  await expect(page.getByRole('heading', { name: /Good pricks get\s*people talking\./ })).toBeVisible();
  await expect(page.getByText(/Review placeholder|Real reviews from real members/)).toHaveCount(0);
});

test('shop filters by category and the expanded view keeps the clinical gate', async ({ page }) => {
  await page.goto('/shop');
  await expect(page.getByRole('button', { name: 'All (17)' })).toBeVisible();
  await page.getByRole('button', { name: 'Weight & Body' }).click();
  for (const name of ['Craving Control', 'Slow & Steady', 'Momentum']) await expect(page.getByRole('article', { name })).toBeVisible();
  // Other weight options are a conversation, never a named product.
  await expect(page.getByRole('article', { name: 'Speak to us about other options' })).toBeVisible();
  await expect(page.getByText(/retatrutide/i)).toHaveCount(0);
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

  // The stacks show what's actually in them, and who they're not for.
  await page.goto('/pens/the-glow-up');
  await expect(page.getByText('BPC-157 + TB-500 + GHK-Cu (the Glow Stack)', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Read this bit. Really.' })).toBeVisible();
  await expect(page.getByText('The Glow Up is not for you if:')).toBeVisible();
  await expect(page.getByText('You have cancer now, or have had it in the past.')).toBeVisible();
  await page.goto('/pens/full-throttle');
  await expect(page.getByRole('heading', { level: 1, name: 'Full Throttle' })).toBeVisible();
  await expect(page.getByText('For him', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('You want to have children soon: testosterone can lower fertility')).toBeVisible();
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

test('quiz asks enough to match, and the match leads straight into screening', async ({ page }) => {
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
  // One clear next step; other matches are links to read, not more "add" buttons.
  await expect(page.getByRole('button', { name: /to my pens/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'I want more energy, sleep or recovery' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Make your nights count again.' }).click();
  await page.getByRole('button', { name: 'Rested' }).click();
  await page.getByRole('button', { name: 'Show my match' }).click();
  await expect(page.getByRole('heading', { name: /Your match:\s*Deep Sleep Rebuild\./ })).toBeVisible();
  await expect(page.getByText('This is a match, not a prescription.')).toBeVisible();

  // The questionnaire comes first, before any account, and brings the matched pen.
  await page.getByRole('link', { name: 'Start my screening' }).click();
  await expect(page).toHaveURL(/\/start\?pen=deep-sleep-rebuild$/);
  // Coming from the quiz means new to peptides, and the goal is known from the pen: neither is asked.
  await expect(page.getByRole('heading', { name: /Picture it\./ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /first time with peptides/ })).toHaveCount(0);
  await expect(page.getByText('Heading for: Sleep. Recover. Repeat.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Where are you heading\?/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'My pens (1)' }).first()).toBeAttached();
});

test('without an account, My pens is their shortlist, and starting over really clears it', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('/pens/the-glow-up');
  await page.getByRole('button', { name: 'Add The Glow Up to my pens' }).first().click();
  // My pens opens the shortlist, not a sign-in page.
  await page.getByRole('link', { name: 'My pens (1)' }).first().click();
  await expect(page).toHaveURL(/\/my-pens$/);
  await expect(page.getByRole('heading', { name: 'Your shortlist.' })).toBeVisible();
  await expect(page.getByText('The Glow Up', { exact: true })).toBeVisible();
  // Into screening: the pen is confirmed, never sold to ("add more").
  await page.getByRole('link', { name: 'Start my screening' }).click();
  await page.getByRole('radio', { name: 'I’m new to peptides' }).click();
  await expect(page.getByRole('heading', { name: /Picture it\./ })).toBeVisible();
  await page.locator('[data-q="vision"] textarea').fill('Glowing.');
  await page.getByRole('button', { name: 'Next' }).click();
  // Starting over clears the answers and the pens.
  await page.getByRole('button', { name: 'Clear my answers' }).click();
  await expect(page.getByRole('link', { name: 'Account' }).first()).toBeAttached();
  await expect(page.getByRole('link', { name: /My pens/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /first time with peptides/ })).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('prick:shortlist'), localStorage.getItem('prick:screening')])).toEqual(['[]', null]);
});

test('a pen chosen up front is confirmed in screening, not sold to', async ({ page }) => {
  await page.goto('/start?pen=rapid-recovery');
  await expect(page.getByRole('heading', { name: /Picture it\./ })).toBeVisible();
  for (let i = 0; i < 5 && !(await page.getByRole('heading', { name: 'The pen you’re bringing.' }).isVisible()); i++) {
    await page.getByRole('button', { name: 'Next' }).click().catch(() => {});
    if (await page.getByText(/What would you like help with|What made you reach out/).first().isVisible()) {
      const reason = page.locator('[data-q="reason"] textarea');
      if (await reason.isVisible()) await reason.fill('Back to running.');
    }
  }
  await expect(page.getByRole('heading', { name: 'The pen you’re bringing.' })).toBeVisible();
  await expect(page.getByText('Rapid Recovery', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^All-Day Energy/ })).toHaveCount(0);
  await expect(page.getByText(/Choose up to/)).toHaveCount(0);
});

test('people already on a protocol take the shorter repeat-script route', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Repeat my script' }).click();
  await expect(page).toHaveURL(/\/start\?route=repeat$/);
  // Straight to their script: no goal, no "picture it", no lifestyle or sleep stops.
  await expect(page.getByRole('heading', { name: 'Your current script.' })).toBeVisible();
  await expect(page.getByText(/Stop 1 of \d+ · Your script/)).toBeVisible();
  const stops = Number((await page.locator('.route__meta').innerText()).match(/of (\d+)/)![1]);
  expect(stops).toBeLessThanOrEqual(6);
  await expect(page.getByLabel('Who prescribed it?')).toBeVisible();
});

test('a script answer left on this device never sends someone from Find yours down the script route', async ({ page }) => {
  await page.goto('/start?route=repeat');
  await expect(page.getByRole('heading', { name: 'Your current script.' })).toBeVisible();
  await page.goto('/start?pen=the-glow-up');
  await expect(page.getByRole('heading', { name: /Picture it\./ })).toBeVisible();
  await expect(page.getByLabel('Who prescribed it?')).toHaveCount(0);
});

test('full journey across roles', async ({ page }) => {
  page.on('dialog', (d) => void d.accept(d.type() === 'prompt' ? 'DEMO-COURIER-1' : undefined));

  // --- Questionnaire first, no account yet --------------------------------------
  const pick = (q: string, option: string) => page.locator(`[data-q="${q}"]`).getByRole('button', { name: option, exact: true }).or(page.locator(`[data-q="${q}"]`).getByRole('radio', { name: option, exact: true })).click();
  const next = () => page.getByRole('button', { name: /^(Next|See where I stand)$/ }).click();
  await page.goto('/start');
  // The fork: new to peptides. Then the destination. One tap each, and the journey moves on.
  await page.getByRole('radio', { name: 'I’m new to peptides' }).click();
  await page.getByRole('radio', { name: /Lose the weight\./ }).click();
  await expect(page.getByRole('heading', { name: /Picture it\./ })).toBeVisible();
  await expect(page.getByText(/Why this matters:.*your goal weight/)).toBeVisible();
  await expect(page.getByText('Heading for: Lose the weight.')).toBeVisible();

  // Then every screen: answer what's shown, move on. The answers each question gets:
  const answers: Record<string, () => Promise<unknown>> = {
    vision: () => page.locator('[data-q="vision"] textarea').fill('My jeans fit again.'),
    reason: () => page.locator('[data-q="reason"] textarea').fill('I want my energy back.'),
    firstName: () => page.getByLabel('First name').fill('Alex'),
    dateOfBirth: async () => {
      await page.getByLabel('Day').fill('15');
      await page.getByLabel('Month').selectOption('1');
      await page.getByLabel('Year').fill('1990');
      await expect(page.getByText(/You’re \d+\./)).toBeVisible();
    },
    sex: () => pick('sex', 'Female'),
    province: () => page.getByLabel('Province').selectOption('Western Cape'),
    city: () => page.getByLabel('City or town').fill('Cape Town'),
    heightCm: () => page.getByLabel('Height (cm)').fill('175'),
    weightKg: () => page.getByLabel('Weight (kg)').fill('82'),
    conditions: () => pick('conditions', 'Migraines'),
    allergies: () => page.locator('[data-q="allergies"]').getByLabel('I have no allergies').check(),
    medications: () => page.getByLabel('Name, row 1').fill('Vitamin D'),
    previousPeptides: () => pick('previousPeptides', 'No'),
    familyHistory: () => page.locator('[data-q="familyHistory"]').getByLabel('Nothing I know of').check(),
    // A family-history "Not sure" is flagged for the clinician.
    'pen:glp1-thyroid': () => pick('pen:glp1-thyroid', 'Not sure'),
    'pen:glp1-current': () => pick('pen:glp1-current', 'No'),
    'pen:weight-goal': () => page.locator('[data-q="pen:weight-goal"] input').fill('75'),
    smoking: () => pick('smoking', 'No'),
    alcohol: () => pick('alcohol', 'Socially'),
    alcoholUnits: () => page.getByLabel(/how many drinks a week/).fill('2'),
    activity: () => pick('activity', 'Moderate'),
    sleepHours: () => page.getByLabel(/Hours of sleep a night/).fill('7'),
    pregnant: () => pick('pregnant', 'No'),
    breastfeeding: () => pick('breastfeeding', 'No'),
    planningPregnancy: () => pick('planningPregnancy', 'Yes'),
    menopauseStage: () => pick('menopauseStage', 'Before menopause'),
  };
  const seen = new Set<string>();
  // Which screen we're on, read without waiting (later parts of a stop have no heading).
  const where = () => page.evaluate(() => document.querySelector('.intake__screen')?.textContent ?? '');
  for (let i = 0; i < 80 && !(await page.getByRole('heading', { name: 'Save your journey.' }).isVisible()); i++) {
    // Saved on this device: leaving part-way loses nothing.
    if (seen.has('firstName') && !seen.has('reloaded') && !(await page.getByLabel('First name').isVisible())) {
      seen.add('reloaded');
      await page.reload();
      await page.getByRole('button', { name: 'Back' }).click();
      await expect(page.getByLabel('First name')).toHaveValue('Alex');
      await next();
    }
    const before = await where();
    for (const q of await page.locator('.intake__screen [data-q]').evaluateAll((els) => els.map((e) => e.getAttribute('data-q') ?? ''))) {
      if (answers[q] && !seen.has(q)) {
        seen.add(q);
        await answers[q]();
      }
    }
    // The pen picker: nothing chosen is an error, then pick one.
    if (!seen.has('pens') && (await page.getByRole('heading', { name: 'Which pen brings you here?' }).isVisible())) {
      seen.add('pens');
      await next();
      await expect(page.getByText('Choose at least one pen, or let your clinician suggest one.')).toBeVisible();
      await page.getByRole('button', { name: /^Craving Control/ }).click();
    }
    // Health lists need an answer, even if that answer is "none".
    if (await page.locator('[data-q="conditions"]').isVisible() && !seen.has('checked-conditions')) {
      seen.add('checked-conditions');
      await page.locator('[data-q="conditions"]').getByRole('button', { name: 'Migraines' }).click();
      await next();
      await expect(page.getByText(/Health conditions: add something, or tick/)).toBeVisible();
      await pick('conditions', 'Migraines');
    }
    await page.waitForTimeout(450);
    const after = await where();
    // Single-tap screens move on by themselves; otherwise press Next (the arriving moment moves on alone).
    if (after === before && (await page.getByRole('button', { name: /^(Next|See where I stand)$/ }).isVisible())) await next();
  }
  expect([...seen]).toEqual(expect.arrayContaining(['pen:glp1-thyroid', 'pregnant', 'sleepHours', 'reloaded']));
  // The good-fit moment reads the answers honestly, plays back their words, then: create an account.
  await expect(page.getByRole('heading', { name: /Thanks for being so open, Alex/ })).toBeVisible();
  await expect(page.getByText('“My jeans fit again.”')).toBeVisible();
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
  await expect(myPens.getByText('Craving Control')).toBeVisible();
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
  const review = page.getByRole('form', { name: /Review Craving Control/ });
  await review.getByLabel('Packs approved').fill('2');
  await review.getByLabel('Frequency').selectOption('DAILY');
  await review.getByLabel('Decision note').fill('Suitable for the fictional demo plan.');
  await review.getByRole('button', { name: 'Approve and release the pen' }).click();
  await expectToast(page, 'Decision recorded: Approved');
  await expect(page.getByText(/2\/2 packs left/)).toBeVisible();

  // --- Super admin: the approved pen is ready to send; the screening stays private --
  await switchRole(page, 'Super admin');
  const release = page.getByRole('article', { name: /Release Craving Control for Alex Newby/ });
  await expect(release.getByText('Craving Control × 2')).toBeVisible();
  await expect(release.getByText(/every day/i)).toBeVisible();
  await expect(page.getByText('I want my energy back.')).toHaveCount(0);
  await expect(page.getByText('Vitamin D')).toHaveCount(0);
  await expect(page.getByText(/sent a screening to the clinician/).first()).toBeVisible();
  await release.getByLabel('Courier reference').fill('DEMO-COURIER-7');
  await release.getByRole('button', { name: 'Mark as sent' }).click();
  await expectToast(page, /Craving Control marked as sent/);
  await expect(page.getByRole('article', { name: /Release Craving Control for Alex Newby/ })).toHaveCount(0);

  // --- Super admin: verification gate, then demo catalogue setup -----------------
  const recovery = page.getByRole('form', { name: /Edit The Glow Up/ });
  await recovery.getByLabel('Purchasable').check();
  await recovery.getByRole('button', { name: /^Save/ }).click();
  await expectToast(page, /regulatorily verified/);

  const metabolic = page.getByRole('form', { name: /Edit Craving Control/ });
  await metabolic.getByLabel('Regulatory status').selectOption('VERIFIED');
  await metabolic.getByLabel('Registration reference').fill('DEMO-REG-0001');
  await metabolic.getByLabel('Purchasable').check();
  await metabolic.getByRole('button', { name: /^Save/ }).click();
  await expectToast(page, /updated/);
  await expect(page.getByRole('form', { name: /Edit Craving Control/ }).locator('.badge', { hasText: /^Purchasable$/ })).toBeVisible();

  // --- Member: adherence and simulated checkout ----------------------------------
  await switchRole(page, 'New member');
  // Just sent: the pen is on its way; doses are logged from the plan.
  await expect(page.getByRole('heading', { name: 'Your pen is on its way.' })).toBeVisible();
  await page.getByRole('button', { name: 'See your plan' }).click();
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
  await expectToast(page, 'Craving Control is on repeat');
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
  // Craving Control was made purchasable in the journey above, but Sam has no saved address yet.
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

test.describe('the doors', () => {
  // A first visit: nothing chosen yet.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('men push their door, get only the men’s range, and come straight back to it next time', async ({ page }) => {
    await page.goto('/');
    const doors = page.getByRole('dialog', { name: 'Which way?' });
    await expect(doors).toBeVisible();
    await page.getByRole('button', { name: /^Men:/ }).click();
    await expect(page).toHaveURL(/\/men$/);
    await expect(doors).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-side', 'men');
    await expect(page.getByRole('heading', { name: /gets\s*him\./ })).toBeAttached();
    await expect(page.getByRole('heading', { name: /all about\s*the source\./ })).toBeAttached();

    await page.goto('/shop');
    await expect(page.getByRole('button', { name: 'All (8)' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Full Throttle' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'The Glow Up' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Appearance & Skin' })).toHaveCount(0);

    // Remembered: the homepage is the men's homepage, no doors.
    await page.goto('/');
    await expect(page).toHaveURL(/\/men$/);
    await expect(doors).toBeHidden();

    // Switch sides from the menu.
    await page.getByRole('button', { name: 'For women' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('data-side', 'women');
    await expect(page.getByRole('heading', { name: /gets\s*her\./ })).toBeAttached();
  });

  test('women push their door and the site is as it was, every pen included', async ({ page }) => {
    await page.goto('/shop');
    await page.getByRole('button', { name: /^Women:/ }).click();
    await expect(page.getByRole('dialog', { name: 'Which way?' })).toBeHidden();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole('button', { name: 'All (17)' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'The Glow Up' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Which way?' })).toBeHidden();
  });
});
