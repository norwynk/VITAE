/**
 * Content-layer rules for the PRICK range:
 * - Layers 1 and 2 never become medical claims and never carry product facts.
 * - Ingredients are never inferred from a stack name.
 * - A higher milligram pen is never presented as more effective.
 * - Investigational ingredients are never described as approved.
 * - Missing information stays missing (NEEDS VERIFICATION), never generated.
 */
import { NONE_OF_THESE, PEN_QUESTION_GROUPS, groupsFor, invalidAnswer, isFlagged, penQuestion } from '../src/domain/penQuestions';
import { PEN_SAFETY } from '../src/domain/penSafety';
import { describe, expect, it } from 'vitest';
import RANGE from '../src/brand/range.json';
import { PEN_BRANDS, feelingLine } from '../src/brand/pens';
import { compositionUndisclosed, createFixtureStore } from '../src/domain/fixtures';
import { CLINICAL_TRUTH_FIELDS, missingTruth } from '../src/domain/model';

const store = createFixtureStore(new Date('2026-10-07T08:00:00Z'));
const treatment = (id: string) => store.treatments[`trt-${id}`];

describe('range', () => {
  it('has every product from the character sheet, in the catalogue and the brand layer', () => {
    expect(RANGE.products).toHaveLength(18);
    for (const p of RANGE.products) {
      expect(treatment(p.id)?.name).toBe(p.name);
      expect(PEN_BRANDS[p.id]).toBeDefined();
    }
  });
});

describe('Layer 3 product truth', () => {
  it('copies the sheet verbatim for disclosed ingredients', () => {
    for (const p of RANGE.products.filter((x) => !compositionUndisclosed(x))) {
      const truth = treatment(p.id).productTruth!;
      expect(truth.activeIngredient).toBe(p.active_ingredient);
      expect(truth.productClass).toBe(p.product_class);
      expect(truth.mechanism).toBe(p.mechanism_summary);
      expect(truth.evidence).toBe(p.evidence_status);
    }
  });

  it('never treats a stack name as an ingredient', () => {
    // An undisclosed stack shows NEEDS VERIFICATION, never its trade name as the ingredient.
    for (const p of RANGE.products.filter(compositionUndisclosed)) {
      const truth = treatment(p.id).productTruth!;
      expect(truth.activeIngredient).toBeUndefined();
      expect(missingTruth(treatment(p.id))).toContain('productTruth.activeIngredient');
    }
    // The two stacks now list their actual peptides (PRICK clinical reference).
    expect(treatment('the-glow-up').productTruth!.activeIngredient).toMatch(/BPC-157.*TB-500.*GHK-Cu/);
    expect(treatment('rapid-recovery').productTruth!.activeIngredient).toMatch(/BPC-157.*TB-500/);
  });

  it('leaves a missing strength missing', () => {
    expect(treatment('age-defiance').productTruth!.supplierStrength).toBeUndefined();
    expect(missingTruth(treatment('age-defiance'))).toContain('productTruth.supplierStrength');
  });
});

describe('Layer 4 clinical truth', () => {
  it('generates nothing: the sheet note is kept only as an internal reviewer note', () => {
    for (const p of RANGE.products) {
      const clinical = treatment(p.id).clinicalTruth!;
      expect(clinical.reviewNote).toBe(p.regulatory_note);
      for (const f of CLINICAL_TRUTH_FIELDS) {
        expect(clinical[f], `${p.id} ${f}`).toBeUndefined();
        expect(missingTruth(treatment(p.id))).toContain(`clinicalTruth.${f}`);
      }
    }
  });

  it('keeps every product unverified and not purchasable', () => {
    for (const p of RANGE.products) {
      expect(treatment(p.id)).toMatchObject({ regulatoryStatus: 'UNCONFIRMED', purchasable: false, requiresClinicianApproval: true });
    }
  });
});

describe('Layers 1 and 2', () => {
  const layerText = (slug: string) => {
    const b = PEN_BRANDS[slug];
    return [b.hook, b.outcome, feelingLine(b), b.transformation, ...b.benefits].join(' ');
  };

  it('carry no product facts', () => {
    for (const b of Object.values(PEN_BRANDS)) {
      expect(Object.keys(b).sort()).toEqual(['benefits', 'botanical', 'cardImage', 'category', 'colours', 'feeling', 'forHim', 'hook', 'outcome', 'penLabel', 'slug', 'transformation']);
    }
  });

  it('never claim approval, proof, treatment or superiority', () => {
    for (const p of RANGE.products) {
      expect(layerText(p.id), p.id).not.toMatch(/\b(approved|FDA|proven|clinically|cures?|treats?|treatment for|stronger|more effective|more potent|\d+\s?mg)\b/i);
    }
  });

  it('never name the ingredient', () => {
    for (const p of RANGE.products) {
      const ingredient = treatment(p.id).productTruth?.activeIngredient;
      if (ingredient) expect(layerText(p.id).toLowerCase(), p.id).not.toContain(ingredient.toLowerCase());
    }
  });

  it('have no benefit statements until they are supplied', () => {
    for (const b of Object.values(PEN_BRANDS)) expect(b.benefits).toEqual([]);
  });
});

describe('branded weight pens', () => {
  const BRANDED = [
    ['slow-and-steady', 'Semaglutide', 'Ozempic®'],
    ['momentum', 'Tirzepatide', 'Mounjaro®'],
  ] as const;

  it('sit in Weight & Body with their own colour, and name the brand only in the product truth', () => {
    const colours = new Set(Object.values(PEN_BRANDS).map((b) => b.colours.main));
    expect(colours.size).toBe(Object.keys(PEN_BRANDS).length);
    for (const [id, ingredient, brand] of BRANDED) {
      const t = treatment(id);
      expect(t).toMatchObject({ category: 'Weight & Body' });
      expect(t.productTruth).toMatchObject({ activeIngredient: ingredient, brandName: brand });
      expect(t.clinicalDescription).toContain(`This is ${brand}`);
      expect(t.clinicalDescription).toMatch(/off-label for weight loss/);
      expect(t.clinicalDescription).not.toMatch(/FDA/);
      expect(missingTruth(t)).toContain('productTruth.supplierStrength');
      // Pen label and card copy carry PRICK names, never the trade name.
      const b = PEN_BRANDS[id];
      const front = [t.name, b.penLabel, b.hook, b.outcome, feelingLine(b), b.transformation].join(' ');
      expect(front).not.toMatch(/ozempic|mounjaro/i);
    }
    expect(treatment('total-body-reset').clinicalDescription).toBe('');
    expect(treatment('total-body-reset').productTruth?.brandName).toBeUndefined();
  });
});

describe('pen safety checks', () => {
  const pen = (slug: string) => ({ slug, category: treatment(slug).category });

  it('every pen with a safety sheet has its own required safety check', () => {
    for (const slug of Object.keys(PEN_SAFETY)) {
      expect(treatment(slug), slug).toBeDefined();
      const own = groupsFor([pen(slug)]).find((g) => g.slugs?.includes(slug));
      expect(own, slug).toBeDefined();
      expect(own!.questions.filter((q) => q.required).length, slug).toBeGreaterThanOrEqual(3);
    }
  });

  it('checklist options never contain the answer separator', () => {
    for (const g of PEN_QUESTION_GROUPS) for (const q of g.questions.filter((x) => x.kind === 'multi')) for (const o of q.options ?? []) expect(o, q.id).not.toContain(',');
  });

  it('flags any condition, and "None of these" stands alone', () => {
    const q = penQuestion('rr-conditions')!;
    expect(isFlagged(q, NONE_OF_THESE)).toBe(false);
    expect(isFlagged(q, 'Serious heart disease')).toBe(true);
    expect(invalidAnswer(q, '')).toMatch(/Answer/);
    expect(invalidAnswer(q, `Serious heart disease, ${NONE_OF_THESE}`)).toMatch(/can’t go with/);
    expect(invalidAnswer(q, 'Serious heart disease, Serious liver disease')).toBeNull();
    expect(isFlagged(penQuestion('ft-fertility')!, 'Yes')).toBe(true);
    expect(isFlagged(penQuestion('gu-injections')!, 'Very anxious about it')).toBe(true);
  });
});
