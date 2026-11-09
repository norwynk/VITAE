'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSide } from '@/hooks/useSide';
import { BrandHero } from './brand/BrandHero';
import { RoyalPrickBand } from './brand/RoyalPrickBand';
import { GoalCards } from './brand/GoalCards';
import { RepeatScriptBand } from './brand/RepeatScriptBand';
import { ClinicalTrustPanel, EditorialStatement, FinalCta, HowItWorks, DesignedForWomen } from './brand/Sections';
import { BrandPage } from './site/BrandPage';
import { Marquee } from './site/Marquee';

/** The brand band: standards and attitude. */
export const STANDARDS_MARQUEE = ['A prick with standards', 'We don’t ghost', 'What happens here stays here', 'No lectures', 'A clinician in your corner'];

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
      <Marquee items={[...STANDARDS_MARQUEE, 'Designed for women']} />
      <GoalCards />
      <HowItWorks />
      <EditorialStatement top="A little prick." bottom="A lot of doctor.">
        <p>Fun on the outside. Serious where it matters.</p>
      </EditorialStatement>
      <RoyalPrickBand />
      <RepeatScriptBand />
      <DesignedForWomen />
      <ClinicalTrustPanel />
      <FinalCta />
    </BrandPage>
  );
}
