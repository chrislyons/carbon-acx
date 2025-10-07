import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ComputeResult } from './profile';
import { compute } from '../lib/api';
import { applyIntent } from '../lib/intent';
import type { IntentResolution } from '../lib/intent';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
  provenance?: Record<string, unknown> | null;
}

export interface ChatBusyState {
  warmup: boolean;
  resolving: boolean;
  computing: boolean;
}

export interface ChatManifestSnapshot {
  manifest: ComputeResult['manifest'] | null;
  sources: string[];
  hash: string;
}

export interface ChatHistoryEntry extends ChatMessage {
  createdAt: number;
}

interface ChatStoreState {
  history: ChatHistoryEntry[];
  busy: ChatBusyState;
  manifest: ChatManifestSnapshot | null;
  error: string | null;
  send: (input: string) => Promise<void>;
  reset: () => void;
  setWarmup: (warmup: boolean) => void;
}

const DEFAULT_BUSY_STATE: ChatBusyState = {
  warmup: false,
  resolving: false,
  computing: false,
};

const STORAGE_KEY = 'acx:chat-manifest';

function createMessageId(): string {
  const cryptoRef = typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { crypto?: Crypto }).crypto : undefined;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normaliseSources(manifest: ComputeResult['manifest'] | null): string[] {
  if (!manifest) {
    return [];
  }
  const ids = Array.isArray(manifest.sources) ? manifest.sources : [];
  return ids.filter((value, index) => typeof value === 'string' && ids.indexOf(value) === index);
}

function hashManifest(manifest: ComputeResult['manifest'] | null): string {
  const payload = JSON.stringify(manifest ?? {});
  let hash = 2166136261;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function snapshotManifest(manifest: ComputeResult['manifest'] | null): ChatManifestSnapshot | null {
  if (!manifest) {
    return null;
  }
  const sources = normaliseSources(manifest);
  return {
    manifest,
    sources,
    hash: hashManifest(manifest),
  } satisfies ChatManifestSnapshot;
}

async function runCompute(resolution: IntentResolution): Promise<ComputeResult> {
  const { request } = resolution;
  const result = await compute<ComputeResult>(request);
  return result;
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set) => ({
      history: [],
      busy: DEFAULT_BUSY_STATE,
      manifest: null,
      error: null,
      setWarmup: (warmup) =>
        set((state) => ({
          busy: { ...state.busy, warmup },
        })),
      reset: () =>
        set({
          history: [],
          busy: DEFAULT_BUSY_STATE,
          manifest: null,
          error: null,
        }),
      send: async (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) {
          return;
        }

        const messageId = createMessageId();
        const createdAt = Date.now();

        set((state) => ({
          history: [
            ...state.history,
            { id: messageId, role: 'user', content: trimmed, createdAt },
            {
              id: `${messageId}-pending`,
              role: 'assistant',
              content: '',
              createdAt,
              pending: true,
            },
          ],
          busy: { ...state.busy, resolving: true },
          error: null,
        }));

        try {
          const resolution = await applyIntent(trimmed);
          set((state) => ({
            busy: { ...state.busy, resolving: false, computing: true },
            history: state.history.map((entry) =>
              entry.id === `${messageId}-pending`
                ? {
                    ...entry,
                    pending: false,
                    content: resolution.response,
                    provenance: resolution.provenance ?? null,
                  }
                : entry,
            ),
          }));

          const result = await runCompute(resolution);
          const snapshot = snapshotManifest(result.manifest ?? null);

          set((state) => ({
            busy: { ...state.busy, computing: false },
            manifest: snapshot,
            history: state.history,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set((state) => ({
            busy: { ...state.busy, resolving: false, computing: false },
            history: state.history.map((entry) =>
              entry.id === `${messageId}-pending`
                ? {
                    ...entry,
                    pending: false,
                    content: message,
                  }
                : entry,
            ),
            error: message,
          }));
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ manifest: state.manifest }),
    },
  ),
);

export type ChatStore = typeof useChatStore;
