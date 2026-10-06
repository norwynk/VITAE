'use client';
import { BrandHero } from './brand/BrandHero';
import { Range } from './brand/Range';
import { ClinicalTrustPanel, EditorialStatement, FinalCta, HowItWorks, LifestylePanel, Reviews, SubscriptionPanel } from './brand/Sections';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';
import { useCatalogue } from '@/hooks/useCatalogue';

export function HomePage() {
  const { pens, error } = useCatalogue();
  return (
    <BrandPage revealKey={pens}>
      <BrandHero />
      <Marquee items={['More good days', 'Small pen. Big plans.', 'Made for real life', 'Well, this is different']} />
      <Range pens={pens} error={error} />
      <EditorialStatement top="A little prick." bottom="A lot more you.">
        <p>Colourful on the outside. Clinician-checked on the inside. Feel more like yourself.</p>
      </EditorialStatement>
      <HowItWorks />
      <LifestylePanel />
      <ClinicalTrustPanel />
      <Reviews />
      <SubscriptionPanel />
      <FinalCta />
    </BrandPage>
  );
}
