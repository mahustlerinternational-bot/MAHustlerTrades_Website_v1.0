'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

import {
  DEFAULT_ELITE_WORKSPACE,
  parseEliteWorkspace,
  type EliteAnalysis,
  type EliteWorkspace,
  type WorkspacePreferences,
} from '@/lib/market-tools/workspace';
import {authFetch} from '@/lib/utils/authFetch';

const STORAGE_KEY = 'maht:elite-tools:workspace:v1';

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_ELITE_WORKSPACE)) as EliteWorkspace;
}

function readLocalWorkspace() {
  if (typeof window === 'undefined') return cloneDefault();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? parseEliteWorkspace(JSON.parse(stored)) : cloneDefault();
  } catch {
    return cloneDefault();
  }
}

export type WorkspaceSaveStatus = 'loading' | 'saved' | 'saving' | 'local' | 'error';

export function useEliteWorkspace() {
  const [workspace, setWorkspace] = useState<EliteWorkspace>(cloneDefault);
  const [status, setStatus] = useState<WorkspaceSaveStatus>('loading');
  const [message, setMessage] = useState('Loading your saved workspace…');
  const readyRef = useRef(false);
  const revisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const local = readLocalWorkspace();
    setWorkspace(local);
    authFetch('/api/me/market-tools/workspace')
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Cloud workspace could not be loaded');
        const remote = parseEliteWorkspace({
          preferences: result.preferences,
          analysis: result.analysis,
        });
        if (!active) return;
        setWorkspace(remote);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        setStatus('saved');
        setMessage(result.updatedAt ? 'Workspace restored from cloud' : 'Workspace ready');
      })
      .catch(error => {
        if (!active) return;
        setStatus('local');
        setMessage(`${error instanceof Error ? error.message : 'Cloud unavailable'} — saving in this browser`);
      })
      .finally(() => {
        readyRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    const revision = ++revisionRef.current;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    setStatus(current => current === 'local' ? 'local' : 'saving');
    setMessage(current => current.includes('migration 017') ? current : 'Saving changes…');

    const timeout = window.setTimeout(async () => {
      try {
        const response = await authFetch('/api/me/market-tools/workspace', {
          method: 'PUT',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify(workspace),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Cloud save failed');
        if (revision !== revisionRef.current) return;
        setStatus('saved');
        setMessage('Saved to your account');
      } catch (error) {
        if (revision !== revisionRef.current) return;
        setStatus('local');
        setMessage(`${error instanceof Error ? error.message : 'Cloud save failed'} — backed up in this browser`);
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [workspace]);

  const updatePreferences = useCallback((
    update: Partial<WorkspacePreferences> | ((current: WorkspacePreferences) => WorkspacePreferences),
  ) => {
    setWorkspace(current => ({
      ...current,
      preferences: typeof update === 'function'
        ? update(current.preferences)
        : {...current.preferences, ...update},
    }));
  }, []);

  const updateAnalysis = useCallback((
    update: Partial<EliteAnalysis> | ((current: EliteAnalysis) => EliteAnalysis),
  ) => {
    setWorkspace(current => ({
      ...current,
      analysis: {
        ...(typeof update === 'function'
          ? update(current.analysis)
          : {...current.analysis, ...update}),
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  return {workspace, status, message, updatePreferences, updateAnalysis};
}
