'use client';
import { useEffect } from 'react';
import { rememberSide } from '@/hooks/useSide';
import { BrandHero } from './brand/BrandHero';
import { RoyalPrickBand } from './brand/RoyalPrickBand';
import { MenGoalCards } from './brand/GoalCards';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { BuiltForMen, ClinicalTrustPanel, EditorialStatement, FinalCta, HowItWorks } from './brand/Sections';
import { STANDARDS_MARQUEE } from './HomePage';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';

/** PRICK for men: the same brand and standards, a cooler palette (html[data-side="men"]). */
export function MenHomePage() {
  // Coming to the men's homepage is choosing the men's side.
  useEffect(() => rememberSide('men'), []);
  return (
    <BrandPage>
      <BrandHero who="Built for men." />
      <Marquee items={[...STANDARDS_MARQUEE, 'Built for men']} />
      <MenGoalCards />
      <HowItWorks />
      <EditorialStatement top="A little prick." bottom="A lot of doctor.">
        <p>Fun on the outside. Serious where it matters.</p>
      </EditorialStatement>
      <RoyalPrickBand />
      <RepeatScriptBand />
      <BuiltForMen />
      <ClinicalTrustPanel />
      <FinalCta />
    </BrandPage>
  );
}
