'use client';
import { BrandHero } from './brand/BrandHero';
import { Range } from './brand/Range';
import { ClinicalTrustPanel, CoFounderQuote, EditorialStatement, FinalCta, HowItWorks, DesignedForWomen, LifestylePanel, Reviews, SubscriptionPanel } from './brand/Sections';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';
import { useCatalogue } from '@/hooks/useCatalogue';

/** Pens that lead the homepage, across categories, whatever order the shop uses. */
const HOME_PENS = ['total-body-reset', 'craving-control', 'body-sculpt', 'the-glow-up', 'skin-rewind', 'skin-rewind-reserve'];

export function HomePage() {
  const { pens, error } = useCatalogue();
  return (
    <BrandPage revealKey={pens}>
      <BrandHero />
      <Marquee items={['All in one pen', 'Quick to use', 'Months of doses in one pen', 'Simple. Easy. Done.', 'A clinician in your corner']} />
      <Range pens={pens} error={error} limit={6} featured={HOME_PENS} />
      <EditorialStatement top="A little prick." bottom="A lot more you.">
        <p>Pretty pens. A clinician in your corner. Feel more like yourself.</p>
      </EditorialStatement>
      <DesignedForWomen />
      <CoFounderQuote />
      <HowItWorks />
      <LifestylePanel />
      <ClinicalTrustPanel />
      <Reviews />
      <SubscriptionPanel />
      <FinalCta />
    </BrandPage>
  );
}
