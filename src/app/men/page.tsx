import type { Metadata } from 'next';
import { MenHomePage } from '@/components/MenHomePage';
import { initialPens } from '@/server/catalogue';

const TITLE = 'PRICK for men: peptide pens with a clinician behind every one';
const DESCRIPTION =
  'Peptide pens for men: recovery, testosterone, body composition and sleep. From a SAHPRA-licensed, batch-tested source, with a clinician’s approval first.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/men' },
  openGraph: { url: '/men', title: TITLE, description: DESCRIPTION },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function Men() {
  return <MenHomePage initialPens={initialPens()} />;
}
