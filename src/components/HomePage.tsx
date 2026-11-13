'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSide } from '@/hooks/useSide';
import { BrandHero } from './brand/BrandHero';
import { Explainer } from './brand/Explainer';
import { HappyHormonesBand } from './brand/HappyHormonesBand';
import { RoyalPrickBand } from './brand/RoyalPrickBand';
import { GoalCards } from './brand/GoalCards';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { ClinicalTrustPanel, CoFounderQuote, EditorialStatement, FinalCta, HowItWorks, DesignedForWomen, LifestylePanel, PeptideProtocols, Reviews, SourceSection, SubscriptionPanel } from './brand/Sections';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';
import { HOUSE_PENS } from '@/brand/housePens';

/** The brand band: standards, with the source story slipped in. */
export const SOURCE_MARQUEE = ['A prick with standards', 'One little prick at a time', 'Know where your prick has been', 'Tested. Every. Batch.', 'A clinician in your corner'];
const MARQUEE = [...SOURCE_MARQUEE, 'Designed for women'];
const MARQUEE_PENS = HOUSE_PENS;

export function HomePage() {
  // A man who lands here from a link inside the site (no full page load) goes home to his own side.
  const { side } = useSide();
  const router = useRouter();
  useEffect(() => {
    // Read now, not from the render: walking through the women's door has already switched it.
    const html = document.documentElement;
    if (side === 'men' && html.dataset.side === 'men' && html.dataset.pendingSide !== 'women') router.replace('/men' + window.location.search + window.location.hash);
  }, [side, router]);
  return (
    <BrandPage>
      <BrandHero />
      <Marquee items={MARQUEE} pens={MARQUEE_PENS} />
      <Explainer />
      <GoalCards />
      <SourceSection />
      <PeptideProtocols />
      <HappyHormonesBand />
      <RoyalPrickBand />
      <RepeatScriptBand />
      <EditorialStatement top="A little prick." bottom="A lot more you.">
        <p>Pretty enough to show off. Serious enough to need a clinician&apos;s yes.</p>
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
