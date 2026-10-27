'use client';
import { useEffect } from 'react';
import { MEN_PENS } from '@/brand/sides';
import type { Treatment } from '@/domain/model';
import { useCatalogue } from '@/hooks/useCatalogue';
import { rememberSide } from '@/hooks/useSide';
import { BrandHero } from './brand/BrandHero';
import { Explainer } from './brand/Explainer';
import { MenGoalCards } from './brand/GoalCards';
import { Range } from './brand/Range';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { BuiltForMen, ClinicalTrustPanel, EditorialStatement, FinalCta, HowItWorks, MEN_FINALE, SourceSection, SubscriptionPanel } from './brand/Sections';
import { SOURCE_MARQUEE } from './HomePage';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';

/**
 * PRICK for men: the same brand and standards, a cooler palette
 * (html[data-side="men"]) and only the men's range.
 */
export function MenHomePage({ initialPens }: { initialPens?: Treatment[] }) {
  const { pens, error } = useCatalogue(initialPens);
  // Coming to the men's homepage is choosing the men's side, for the shop and quiz too.
  useEffect(() => rememberSide('men'), []);
  const range = pens?.filter((p) => MEN_PENS.includes(p.treatment.slug)) ?? null;
  return (
    <BrandPage revealKey={pens}>
      <BrandHero pen="full-throttle" who="Built for men." />
      <Marquee items={[...SOURCE_MARQUEE, 'Built for men']} />
      <Explainer />
      <MenGoalCards />
      <SourceSection />
      <Range
        pens={range}
        error={error}
        limit={6}
        featured={MEN_PENS}
        title={
          <>
            Meet the
            <br />
            pricks.
          </>
        }
      />
      <RepeatScriptBand />
      <EditorialStatement top="A little prick." bottom="A lot more you.">
        <p>Built to perform. Serious enough to need a clinician&apos;s yes.</p>
      </EditorialStatement>
      <BuiltForMen />
      <HowItWorks pick="Recovery, drive, body or sleep. Start with what you want back, not the formula." pens={MEN_FINALE} />
      <ClinicalTrustPanel />
      <SubscriptionPanel pens={['rapid-recovery', 'full-throttle', 'deep-sleep-rebuild']} />
      <FinalCta pens={MEN_FINALE} />
    </BrandPage>
  );
}
