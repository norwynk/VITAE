'use client';
import type { Treatment } from '@/domain/model';
import { BrandHero } from './brand/BrandHero';
import { GoalCards } from './brand/GoalCards';
import { Range } from './brand/Range';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { ClinicalTrustPanel, CoFounderQuote, EditorialStatement, FinalCta, HowItWorks, DesignedForWomen, LifestylePanel, Reviews, SourceSection, SubscriptionPanel } from './brand/Sections';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';
import { useCatalogue } from '@/hooks/useCatalogue';

/** Pens that lead the homepage, across categories, whatever order the shop uses. */
const HOME_PENS = ['slow-and-steady', 'craving-control', 'body-sculpt', 'the-glow-up', 'skin-rewind', 'skin-rewind-reserve'];

/** The brand band: the source first, then the standards. */
export const SOURCE_MARQUEE = ['Licensed source', 'Every batch tested', 'Cold chain to your door', 'Months of doses in one pen', 'A clinician in your corner', 'A prick with standards'];
const MARQUEE = [...SOURCE_MARQUEE, 'Designed for women'];

export function HomePage({ initialPens }: { initialPens?: Treatment[] }) {
  const { pens, error } = useCatalogue(initialPens);
  return (
    <BrandPage revealKey={pens}>
      <BrandHero />
      <Marquee items={MARQUEE} />
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
