import type { Metadata } from 'next';
import { MyPensPage } from '@/components/MyPensPage';
import { initialPens } from '@/server/catalogue';

export const metadata: Metadata = { title: 'My pens', robots: { index: false, follow: false } };

export default function MyPens() {
  return <MyPensPage initialPens={initialPens()} />;
}
