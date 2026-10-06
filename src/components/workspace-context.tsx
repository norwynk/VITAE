'use client';
import { createContext, useContext } from 'react';
import type { CommandInput } from '@/domain/commands';
import type { Workspace } from '@/services/repository';

export interface WorkspaceApi {
  workspace: Workspace;
  busy: boolean;
  /** Runs a command through the repository; resolves true on success. */
  run: (command: CommandInput, success: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside a workspace');
  return ctx;
}
