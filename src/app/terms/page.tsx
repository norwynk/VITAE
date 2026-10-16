import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Terms of use' };

export default function Terms() {
  return (
    <LegalPage eyebrow="The serious bit" title="Terms of use." updated="16 October 2026">
      <p className="about__lead">The short version: be honest with us, and we&apos;ll be honest with you.</p>

      <h2>Who can use PRICK</h2>
      <p>You must be 18 or older and live in South Africa. Your account is for you alone. Keep your password private.</p>

      <h2>A clinician decides</h2>
      <p>
        Every pen needs a health screening and a registered clinician&apos;s approval. Choosing a pen is a request, not an
        order. Your clinician may approve it, suggest something else, ask for more information, or decide it isn&apos;t right
        for you. We can&apos;t promise any pen will be approved or will give a particular result.
      </p>

      <h2>Tell us the truth</h2>
      <p>
        Your clinician relies on your answers. Please answer fully and honestly, and update us if your health, medicines or
        pregnancy status change. Never share a pen or use one that wasn&apos;t prescribed for you.
      </p>

      <h2>Not for emergencies</h2>
      <p>
        PRICK is not an emergency service, and nothing on this site is medical advice on its own. If you feel very unwell,
        call 10177 or go to your nearest emergency unit.
      </p>

      <h2>Getting your pens</h2>
      <p>
        Online ordering isn&apos;t open yet. If your clinician approves a pen, your care team will contact you to arrange
        supply, price and delivery before anything is charged.
      </p>

      <h2>Your information</h2>
      <p>
        How we handle your personal and health information is set out in our <a href="/privacy">privacy notice</a>.
      </p>

      <h2>Changes and the law</h2>
      <p>
        We may update these terms and will tell you about changes that matter. South African law applies. Questions? Call
        Norwyn K on 082 401 6066.
      </p>
    </LegalPage>
  );
}
