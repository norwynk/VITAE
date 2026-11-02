'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSide } from '@/hooks/useSide';
import type { Treatment } from '@/domain/model';
import { BrandHero } from './brand/BrandHero';
import { Explainer } from './brand/Explainer';
import { GoalCards } from './brand/GoalCards';
import { Range } from './brand/Range';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { ClinicalTrustPanel, CoFounderQuote, EditorialStatement, FinalCta, HowItWorks, DesignedForWomen, LifestylePanel, Reviews, SourceSection, SubscriptionPanel } from './brand/Sections';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';
import { useCatalogue } from '@/hooks/useCatalogue';

/** Pens that lead the homepage, across categories, whatever order the shop uses. */
const HOME_PENS = ['slow-and-steady', 'craving-control', 'body-sculpt', 'the-glow-up', 'skin-rewind', 'skin-rewind-reserve'];

/** The brand band: standards, with the source story slipped in. */
export const SOURCE_MARQUEE = ['A prick with standards', 'Months of doses in one pen', 'Know where your prick has been', 'Tested. Every. Batch.', 'A clinician in your corner'];
const MARQUEE = [...SOURCE_MARQUEE, 'Designed for women'];

export function HomePage({ initialPens }: { initialPens?: Treatment[] }) {
  const { pens, error } = useCatalogue(initialPens);
  // A man who lands here from a link inside the site (no full page load) goes home to his own side.
  const { side } = useSide();
  const router = useRouter();
  useEffect(() => {
    // Read now, not from the render: walking through the women's door has already switched it.
    const html = document.documentElement;
    if (side === 'men' && html.dataset.side === 'men' && html.dataset.pendingSide !== 'women') router.replace('/men' + window.location.search + window.location.hash);
  }, [side, router]);
  return (
    <BrandPage revealKey={pens}>
      <BrandHero />
      <Marquee items={MARQUEE} />
      <Explainer />
      <GoalCards />
      <SourceSection />
      <Range
        pens={pens}
        error={error}
        limit={6}
        featured={HOME_PENS}
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
