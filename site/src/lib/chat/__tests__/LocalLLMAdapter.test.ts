import type { MLCEngine } from '@mlc-ai/web-llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadModel, LocalLLMAdapter, safeJoin } from '../LocalLLMAdapter';

const {
  completionSpy,
  getGPUVendorSpy,
  createWebWorkerSpy,
  getLastOptions,
  resetLastOptions,
  workerConstructorMock,
} = vi.hoisted(() => {
  const completionSpy = vi.fn(async () => ({
    choices: [
      {
        finish_reason: 'stop',
        message: { role: 'assistant', content: '{"edits":[],"explanation":"local"}' },
      },
    ],
  }));

  const getGPUVendorSpy = vi.fn(async () => 'MockVendor');

  let lastOptions: Record<string, unknown> | null = null;

  const workerConstructorMock = vi.fn(() => ({
    postMessage: vi.fn(),
    onmessage: null,
  }));

  const engineMock = {
    chat: {
      completions: {
        create: completionSpy,
      },
    },
    getGPUVendor: getGPUVendorSpy,
  } as unknown as MLCEngine;

  const createWebWorkerSpy = vi.fn(async (_worker: unknown, _modelId: string, options: Record<string, unknown>) => {
    lastOptions = options;
    return engineMock;
  });

  return {
    completionSpy,
    getGPUVendorSpy,
    createWebWorkerSpy,
    getLastOptions: () => lastOptions,
    resetLastOptions: () => {
      lastOptions = null;
    },
    workerConstructorMock,
  };
});

vi.mock('../LocalLLMWorker?worker', () => ({
  __esModule: true,
  default: workerConstructorMock,
}));

vi.mock('@mlc-ai/web-llm', () => ({
  __esModule: true,
  CreateWebWorkerMLCEngine: createWebWorkerSpy,
}));

beforeEach(() => {
  completionSpy.mockClear();
  getGPUVendorSpy.mockClear();
  createWebWorkerSpy.mockClear();
  workerConstructorMock.mockClear();
  resetLastOptions();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('safeJoin', () => {
  it('rejects path traversal attempts', async () => {
    await expect(safeJoin('/models/test/', '../../evil.txt')).rejects.toThrow('Unsafe model path');
  });
});

describe('loadModel', () => {
  it('requests the scoped model folder', async () => {
    const metadata = { model_lib: 'mock-model.wasm', model_id: 'demo-model' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(metadata), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await loadModel('demo-model');
    expect(createWebWorkerSpy).toHaveBeenCalledWith(
      expect.anything(),
      'demo-model',
      expect.objectContaining({
        appConfig: expect.objectContaining({
          model_list: expect.arrayContaining([
            expect.objectContaining({
              model: expect.stringContaining('/models/demo-model/'),
              model_lib: expect.stringContaining('/models/demo-model/mock-model.wasm'),
            }),
          ]),
        }),
      }),
    );
    expect(getLastOptions()?.appConfig).toBeDefined();
    expect(workerConstructorMock).toHaveBeenCalled();
  });
});

describe('LocalLLMAdapter', () => {
  it('runs completions without external fetches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ model_lib: 'mock-model.wasm', model_id: 'qwen2.5-1.5b-instruct-q4f16_1' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    const adapter = new LocalLLMAdapter();
    const result = await adapter.interpret([{ role: 'user', content: 'hello there' }]);

    expect(result.explanation).toBe('local');
    expect(result.edits).toEqual([]);
    expect(completionSpy).toHaveBeenCalled();
  });
});
