import type { Metadata } from 'next';
import { ShopPage } from '@/components/ShopPage';

export const metadata: Metadata = { title: 'Meet the pricks' };

export default function Shop() {
  return <ShopPage />;
}
