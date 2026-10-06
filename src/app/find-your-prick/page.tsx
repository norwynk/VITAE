import type { Metadata } from 'next';
import { QuizPage } from '@/components/QuizPage';

export const metadata: Metadata = { title: 'Find your prick' };

export default function FindYourPrick() {
  return <QuizPage />;
}
