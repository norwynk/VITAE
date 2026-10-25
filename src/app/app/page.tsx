import type { Metadata } from 'next';
import { WorkspaceApp } from '@/components/WorkspaceApp';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default function AppPage() {
  return <WorkspaceApp />;
}
