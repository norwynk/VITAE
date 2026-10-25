import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = { title: 'Privacy notice', alternates: { canonical: '/privacy' } };

export default function Privacy() {
  return (
    <LegalPage eyebrow="The serious bit" title="Privacy notice." updated="16 October 2026">
      <p className="about__lead">
        Your health is personal. This notice explains what we collect, why, who sees it and what you can ask us to do with it,
        under the Protection of Personal Information Act (POPIA).
      </p>

      <h2>Who we are</h2>
      <p>
        PRICK is the responsible party for your personal information. Our Information Officer is Norwyn K, on 082 401 6066. Our
        clinical lead is Dr Kylee Montgomerie, on 082 457 1926.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your account: email address and a password (we never see or store your password ourselves).</li>
        <li>Your details: name, date of birth, South African ID or passport number, mobile number, province and city.</li>
        <li>
          Your health: your screening answers, including medical history, medicines, allergies, lifestyle, sleep, mood,
          reproductive and sexual health, height, weight and anything else you choose to tell us.
        </li>
        <li>Your pens: the pens you ask about and your clinician&apos;s decisions, plans, check-ins and messages.</li>
        <li>A delivery address, if you save one.</li>
      </ul>
      <p>
        Your health answers are special personal information under POPIA. We only process them with your consent and for your
        care.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>So a registered clinician can decide, safely and lawfully, whether a pen is right for you.</li>
        <li>To run your care: plans, reminders, check-ins and messages with your care team.</li>
        <li>To arrange supply and delivery of anything your clinician approves.</li>
        <li>To meet our legal and professional record-keeping duties.</li>
        <li>To send news and offers, only if you said yes. You can stop these at any time.</li>
      </ul>
      <p>We do not sell your information, and we never use your health answers for advertising.</p>

      <h2>Who sees it</h2>
      <ul>
        <li>Your clinician sees your screening and health information.</li>
        <li>Our support team sees only what they need to help you, such as your name and where you are in the process. Not your health answers.</li>
        <li>Anyone preparing a delivery sees only your delivery details.</li>
        <li>
          Google Cloud (Firebase) stores our data and signs you in, as our operator under a written agreement. Your information
          is stored in Google&apos;s Johannesburg data centre in South Africa.
        </li>
      </ul>
      <p>Every time staff open or change a record, it is logged.</p>

      <h2>How we protect it</h2>
      <p>
        Information is encrypted in transit and at rest, access is limited by role, staff sign in with two-step verification,
        and only your own clinician can open your clinical record.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep health records for as long as the law and professional rules require (generally at least six years after your
        last contact with us), then delete or anonymise them.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see the information we hold about you, ask us to correct or delete it, object to how we use it, or
        withdraw your consent. You can withdraw consent in your account under <strong>My health</strong>, or contact our
        Information Officer. Withdrawing consent stops new processing, but we may need to keep some records by law.
      </p>
      <p>
        If you are unhappy with how we handle your information, please tell us first. You may also complain to the Information
        Regulator (South Africa) at inforegulator.org.za.
      </p>

      <h2>Changes</h2>
      <p>If we change this notice in a way that matters, we&apos;ll tell you and, where needed, ask for your consent again.</p>
    </LegalPage>
  );
}
