import type { Metadata } from 'next';
import { ShopPage } from '@/components/ShopPage';
import { MembersOnly } from '@/components/site/MembersOnly';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default function Shop() {
  return (
    <MembersOnly>
      <ShopPage />
    </MembersOnly>
  );
}
