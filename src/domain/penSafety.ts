/**
 * What a member must know before choosing these pens, in plain words. From
 * the PRICK clinical reference "Understanding Peptides" (contraindication and
 * dosage tables). Shown on the product page and before the pen's safety
 * questions. Doses are never shown: the clinician sets them.
 */

export interface PenSafety {
  /** What is in the pen. */
  contains: string;
  /** Hard stops ("Avoid" / "Do not use" in the reference). */
  notFor: string[];
  /** "Caution" rows: the clinician needs to know, it may still be possible. */
  tellUs: string[];
  /** What a course looks like. */
  course: string;
}

export const PEN_SAFETY: Record<string, PenSafety> = {
  'the-glow-up': {
    contains: 'BPC-157, TB-500 and GHK-Cu (a copper peptide), together in one pen.',
    notFor: [
      'You are pregnant or breastfeeding.',
      'You have cancer now, or have had it in the past.',
      'You are under 18.',
    ],
    tellUs: [
      'Diabetes that isn’t well controlled',
      'An autoimmune condition, or medicine that lowers your immune system',
      'Serious liver or kidney disease',
      'An infection you’re being treated for',
      'A bleeding disorder, or blood thinners',
      'An organ transplant',
      'High blood pressure that isn’t controlled, or serious heart disease',
      'An allergy to peptides or injection ingredients',
      'Feeling very anxious about injections or new treatments',
    ],
    course: 'Usually 4 to 8 weeks (up to 12 for the copper peptide), then a 4-week break before another round.',
  },
  'rapid-recovery': {
    contains: 'BPC-157 and TB-500 (the “Wolverine Stack”), together in one pen.',
    notFor: [
      'You have cancer now, or have had it in the past.',
      'You are pregnant or breastfeeding.',
      'You are under 18.',
    ],
    tellUs: [
      'Diabetes that isn’t well controlled, or diabetic eye disease',
      'Serious heart disease, a stroke, or a blood clotting disorder',
      'An active autoimmune condition, or medicine that lowers your immune system',
      'Serious liver or kidney disease',
      'An infection you’re being treated for',
      'High blood pressure that isn’t controlled',
      'You swell up or retain fluid easily',
      'Anabolic steroids or other performance-enhancing drugs',
    ],
    course: 'Usually 4 to 6 weeks, then a 4-week break before another round.',
  },
  'full-throttle': {
    contains: 'Testosterone cypionate (testosterone replacement therapy, TRT).',
    notFor: [
      'You have prostate cancer, breast cancer, or another hormone-sensitive cancer.',
      'You are pregnant or breastfeeding.',
      'You are allergic to testosterone or the oils it is carried in.',
      'You are under 18, unless a specialist prescribes it.',
    ],
    tellUs: [
      'You want to have children soon: testosterone can lower fertility',
      'A recent heart attack or stroke, or heart failure',
      'A blood clot (DVT or in the lungs)',
      'A high red blood cell count (polycythaemia)',
      'High blood pressure that isn’t controlled',
      'Sleep apnoea that isn’t treated',
      'An enlarged prostate that makes it hard to pee',
      'Serious liver or kidney disease',
      'Diabetes treated with medicine that lowers blood sugar',
      'Anabolic steroids or other hormones',
      'A history of aggression or unstable mood',
    ],
    course: 'Ongoing, usually an injection once or twice a week, with regular blood tests so your clinician can keep your dose right.',
  },
};

export function penSafety(slug: string): PenSafety | undefined {
  return PEN_SAFETY[slug];
}
