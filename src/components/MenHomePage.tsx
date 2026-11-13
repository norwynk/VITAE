'use client';
import { useEffect } from 'react';
import { MEN_HOUSE_PENS } from '@/brand/housePens';
import { rememberSide } from '@/hooks/useSide';
import { BrandHero } from './brand/BrandHero';
import { Explainer } from './brand/Explainer';
import { HappyHormonesBand } from './brand/HappyHormonesBand';
import { RoyalPrickBand } from './brand/RoyalPrickBand';
import { MenGoalCards } from './brand/GoalCards';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { BuiltForMen, ClinicalTrustPanel, EditorialStatement, FinalCta, HowItWorks, MEN_FINALE, PeptideProtocols, SourceSection, SubscriptionPanel } from './brand/Sections';
import { SOURCE_MARQUEE } from './HomePage';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';

const MARQUEE_PENS = MEN_HOUSE_PENS;

/**
 * PRICK for men: the same brand and standards, a cooler palette
 * (html[data-side="men"]).
 */
export function MenHomePage() {
  // Coming to the men's homepage is choosing the men's side, for the shop and quiz too.
  useEffect(() => rememberSide('men'), []);
  return (
    <BrandPage>
      <BrandHero men who="Built for men." />
      <Marquee items={[...SOURCE_MARQUEE, 'Built for men']} pens={MARQUEE_PENS} />
      <Explainer />
      <MenGoalCards />
      <SourceSection />
      <PeptideProtocols men />
      <HappyHormonesBand />
      <RoyalPrickBand />
      <RepeatScriptBand />
      <EditorialStatement top="A little prick." bottom="A lot more you.">
        <p>Built to perform. Serious enough to need a clinician&apos;s yes.</p>
      </EditorialStatement>
      <BuiltForMen />
      <HowItWorks pick="Recovery, drive, body or sleep. Start with what you want back, not the formula." pens={MEN_FINALE} />
      <ClinicalTrustPanel />
      <SubscriptionPanel pens={MEN_HOUSE_PENS.slice(0, 3)} />
      <FinalCta pens={MEN_FINALE} />
    </BrandPage>
  );
}
