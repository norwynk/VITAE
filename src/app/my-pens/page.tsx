import type { Metadata } from 'next';
import { MyPensPage } from '@/components/MyPensPage';

export const metadata: Metadata = { title: 'My pens' };

export default function MyPens() {
  return <MyPensPage />;
}
