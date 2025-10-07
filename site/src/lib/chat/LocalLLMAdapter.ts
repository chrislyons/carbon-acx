import {
  CreateMLCEngine,
  prebuiltAppConfig,
  type AppConfig,
  type ChatCompletionAssistantMessageParam,
  type ChatCompletionContentPart,
  type ChatCompletionContentPartText,
  type ChatCompletionMessageParam,
  type ChatCompletionMessageToolCall,
  type ChatCompletionTool,
  type ChatCompletionToolMessageParam,
  type MLCEngine,
  type ModelRecord,
} from '@mlc-ai/web-llm';

import type { CatalogActivity, CatalogProfile } from '../catalog';
import { loadCatalog } from '../catalog';
import type { Intent, IntentEdit, Interpreter, Msg, MsgToolCall } from './Interpreter';

const DEFAULT_MODEL_FOLDER = 'qwen2.5-1.5b-instruct-q4f16_1';
const MAX_TOOL_RESULTS = 8;
const SYSTEM_PROMPT = [
  'You are the Carbon ACX planning interpreter running entirely in the browser using a local model.',
  'Generate a deterministic JSON object with the shape {"edits": [...], "explanation": "..."}.',
  'Each edit must be an object containing an "action" string along with optional "target", "value", and "metadata" fields.',
  'Never invent emission factors, schedules, or catalog items. Only reference identifiers that exist in catalog.activities or catalog.profiles.',
  'Use the list_activities and list_profiles tools to inspect catalog data before proposing edits.',
  'If information is missing or ambiguous, ask the user to clarify instead of guessing.',
  'Respond with helpful natural language inside the "explanation" field that summarises the applied edits for the user.',
].join('\n');

interface ModelConfigMetadata {
  readonly model_id?: string;
  readonly model_lib?: string;
}

interface CatalogMatch<T extends Record<string, unknown>> {
  readonly id: string;
  readonly label: string;
  readonly summary?: string;
  readonly data: T;
  readonly keywordIndex: number;
  readonly hasPrefixMatch: boolean;
}

interface CatalogSearchResult<T extends Record<string, unknown>> {
  readonly keyword: string;
  readonly limit: number;
  readonly total: number;
  readonly matches: readonly CatalogMatch<T>[];
  readonly source: string;
}

interface SearchOptions<T extends Record<string, unknown>> {
  getId(record: T): string | null;
  getLabel(record: T): string | null;
  getSummary?(record: T): string | null;
  getExtraTerms?(record: T): readonly string[];
  readonly source: string;
}

export class LocalLLMAdapter implements Interpreter {
  private enginePromise: Promise<MLCEngine> | null = null;
  private readonly modelFolderId: string;
  private readonly modelBaseUrl: string;
  private engineModelId: string | null = null;
  private modelRecord: ModelRecord | null = null;
  private readonly systemMessage: ChatCompletionMessageParam;
  private readonly tools: ChatCompletionTool[];

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('LocalLLMAdapter requires a browser environment.');
    }

    this.modelFolderId = resolveModelFolderId();
    this.modelBaseUrl = buildModelBaseUrl(this.modelFolderId);
    this.systemMessage = { role: 'system', content: SYSTEM_PROMPT } satisfies ChatCompletionMessageParam;
    this.tools = buildToolDefinitions();
  }

  public async interpret(messages: readonly Msg[]): Promise<Intent> {
    const engine = await this.getEngine();
    const modelId = this.engineModelId;
    if (!modelId) {
      throw new Error('Local model failed to initialise.');
    }

    const conversation: ChatCompletionMessageParam[] = [this.systemMessage, ...this.convertMessages(messages)];
    return this.runCompletion(engine, modelId, conversation);
  }

  private async getEngine(): Promise<MLCEngine> {
    if (!this.enginePromise) {
      this.enginePromise = this.createEngine().catch((error) => {
        this.enginePromise = null;
        throw error;
      });
    }

    return this.enginePromise;
  }

  private async createEngine(): Promise<MLCEngine> {
    const { appConfig, modelId, modelRecord } = await this.prepareAppConfig();
    this.engineModelId = modelId;
    this.modelRecord = modelRecord;

    const engine = await CreateMLCEngine(modelId, {
      appConfig,
      initProgressCallback: (report) => {
        const pct = report.progress !== undefined ? Math.round(report.progress * 100) : null;
        const prefix = '[LocalLLMAdapter] Model initialisation';
        if (pct !== null) {
          console.info(`${prefix}: ${report.text ?? 'loading'} (${pct}%)`);
        } else {
          console.info(`${prefix}: ${report.text ?? 'loading'}`);
        }
      },
    });

    if (modelRecord?.vram_required_MB) {
      console.info(
        `[LocalLLMAdapter] ${modelRecord.model_id} estimated VRAM requirement: ${modelRecord.vram_required_MB.toFixed(2)} MB`,
      );
    }

    try {
      const vendor = await engine.getGPUVendor();
      if (vendor) {
        console.info(`[LocalLLMAdapter] WebGPU device vendor: ${vendor}`);
      }
    } catch (error) {
      console.warn('[LocalLLMAdapter] Unable to query WebGPU vendor', error);
    }

    return engine;
  }

  private async prepareAppConfig(): Promise<{ appConfig: AppConfig; modelId: string; modelRecord: ModelRecord | null }> {
    const metadata = await this.fetchModelMetadata();
    const candidateIds = new Set<string>();
    candidateIds.add(this.modelFolderId);
    if (metadata?.model_id) {
      candidateIds.add(metadata.model_id);
    }

    const record = findMatchingModelRecord(candidateIds);
    const modelId = record?.model_id ?? metadata?.model_id ?? this.modelFolderId;
    const modelLibUrl = this.resolveModelLib(record, metadata);

    const entry: ModelRecord = {
      model: this.modelBaseUrl,
      model_id: modelId,
      model_lib: modelLibUrl,
    };

    if (record?.overrides) {
      entry.overrides = record.overrides;
    }
    if (record?.vram_required_MB) {
      entry.vram_required_MB = record.vram_required_MB;
    }
    if (record?.low_resource_required !== undefined) {
      entry.low_resource_required = record.low_resource_required;
    }
    if (record?.buffer_size_required_bytes) {
      entry.buffer_size_required_bytes = record.buffer_size_required_bytes;
    }
    if (record?.required_features) {
      entry.required_features = record.required_features;
    }

    const appConfig: AppConfig = {
      model_list: [entry],
      useIndexedDBCache: true,
    };

    return { appConfig, modelId, modelRecord: record ?? null };
  }

  private async fetchModelMetadata(): Promise<ModelConfigMetadata | null> {
    const configUrl = new URL('mlc-chat-config.json', this.modelBaseUrl).toString();
    try {
      const response = await fetch(configUrl);
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as ModelConfigMetadata;
      return data;
    } catch (error) {
      console.warn('[LocalLLMAdapter] Unable to read mlc-chat-config.json', error);
      return null;
    }
  }

  private resolveModelLib(record: ModelRecord | null, metadata: ModelConfigMetadata | null): string {
    const candidates: string[] = [];
    if (metadata?.model_lib) {
      candidates.push(metadata.model_lib);
    }
    if (record?.model_lib) {
      candidates.push(record.model_lib);
    }

    for (const candidate of candidates) {
      const resolved = resolveModelLibUrl(candidate, this.modelBaseUrl);
      if (resolved) {
        return resolved;
      }
    }

    throw new Error(`Unable to resolve model wasm library for ${this.modelFolderId}`);
  }

  private async runCompletion(
    engine: MLCEngine,
    modelId: string,
    initialMessages: ChatCompletionMessageParam[],
  ): Promise<Intent> {
    const messages: ChatCompletionMessageParam[] = [...initialMessages];

    for (let iteration = 0; iteration < 8; iteration += 1) {
      const completion = await engine.chat.completions.create({
        model: modelId,
        messages,
        tools: this.tools,
        tool_choice: 'auto',
        temperature: 0,
        top_p: 0,
        seed: 0,
        response_format: { type: 'json_object' },
      });

      const choice = completion.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error('Local model returned an empty response.');
      }

      const assistantMessage = choice.message as ChatCompletionAssistantMessageParam;
      messages.push(assistantMessage);

      if (choice.finish_reason === 'tool_calls' && assistantMessage.tool_calls?.length) {
        for (const toolCall of assistantMessage.tool_calls) {
          const toolMessage = await this.executeTool(toolCall);
          messages.push(toolMessage);
        }
        continue;
      }

      const content = extractAssistantContent(assistantMessage);
      const parsed = this.parseIntent(content);
      return parsed;
    }

    throw new Error('Local model exceeded the maximum number of tool iterations.');
  }

  private async executeTool(toolCall: ChatCompletionMessageToolCall): Promise<ChatCompletionToolMessageParam> {
    const rawArgs = toolCall.function?.arguments ?? '{}';
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch (error) {
      console.warn('[LocalLLMAdapter] Unable to parse tool arguments', error);
      args = {};
    }

    const keyword = typeof args.keyword === 'string' ? args.keyword : '';
    const limitValue = typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : undefined;
    const limit = limitValue && limitValue > 0 ? Math.min(limitValue, 20) : MAX_TOOL_RESULTS;

    let payload: unknown;
    try {
      switch (toolCall.function?.name) {
        case 'list_activities':
          payload = await this.listActivities(keyword, limit);
          break;
        case 'list_profiles':
          payload = await this.listProfiles(keyword, limit);
          break;
        default:
          payload = { error: `Unknown tool: ${toolCall.function?.name ?? 'unspecified'}` };
      }
    } catch (error) {
      payload = {
        error: `Tool execution failed: ${toolCall.function?.name ?? 'unknown'}`,
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: stringifyToolResult(payload),
    } satisfies ChatCompletionToolMessageParam;
  }

  private async listActivities(keyword: string, limit: number): Promise<CatalogSearchResult<CatalogActivity>> {
    const catalog = await loadCatalog();
    const matches = searchCatalogRecords<CatalogActivity>(catalog.activities, keyword, {
      getId: getActivityId,
      getLabel: getActivityLabel,
      getSummary: getActivitySummary,
      getExtraTerms: getActivityExtraTerms,
      source: 'catalog.activities',
    });

    return buildSearchResult(keyword, limit, matches, 'catalog.activities');
  }

  private async listProfiles(keyword: string, limit: number): Promise<CatalogSearchResult<CatalogProfile>> {
    const catalog = await loadCatalog();
    const matches = searchCatalogRecords<CatalogProfile>(catalog.profiles, keyword, {
      getId: getProfileId,
      getLabel: getProfileLabel,
      getSummary: getProfileSummary,
      getExtraTerms: getProfileExtraTerms,
      source: 'catalog.profiles',
    });

    return buildSearchResult(keyword, limit, matches, 'catalog.profiles');
  }

  private parseIntent(content: string): Intent {
    const parsed = parseJSON(content);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Local model returned a non-object intent payload.');
    }

    const record = parsed as Record<string, unknown>;
    const editsRaw = Array.isArray(record.edits) ? record.edits : [];
    const edits: IntentEdit[] = [];

    for (const entry of editsRaw) {
      const edit = normaliseIntentEdit(entry);
      if (edit) {
        edits.push(edit);
      }
    }

    const explanation = typeof record.explanation === 'string' ? record.explanation.trim() : '';

    return {
      edits,
      explanation,
    } satisfies Intent;
  }

  private convertMessages(messages: readonly Msg[]): ChatCompletionMessageParam[] {
    return messages
      .map((message) => this.convertMessage(message))
      .filter((message): message is ChatCompletionMessageParam => message !== null);
  }

  private convertMessage(message: Msg): ChatCompletionMessageParam | null {
    const base = message.content ?? '';
    const content = typeof base === 'string' ? base : String(base ?? '');

    if (message.role === 'assistant') {
      return {
        role: 'assistant',
        content,
        ...(message.toolCalls ? { tool_calls: convertToolCalls(message.toolCalls) } : {}),
      } satisfies ChatCompletionMessageParam;
    }

    if (message.role === 'tool') {
      if (!message.toolCallId) {
        return null;
      }

      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        content,
      } satisfies ChatCompletionMessageParam;
    }

    if (message.role === 'system') {
      return {
        role: 'system',
        content,
        ...(message.name ? { name: message.name } : {}),
      } satisfies ChatCompletionMessageParam;
    }

    return {
      role: 'user',
      content,
      ...(message.name ? { name: message.name } : {}),
    } satisfies ChatCompletionMessageParam;
  }
}

function resolveModelFolderId(): string {
  const candidate = readModelQueryParam() ?? readModelEnvDefault() ?? DEFAULT_MODEL_FOLDER;
  return sanitiseModelId(candidate);
}

function readModelQueryParam(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const url = new URL(window.location.href);
    const value = url.searchParams.get('model');
    return value ? value.trim() : null;
  } catch {
    return null;
  }
}

function readModelEnvDefault(): string | null {
  const value = import.meta.env.VITE_MODEL_ID;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function sanitiseModelId(input: string): string {
  const trimmed = input.trim();
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new Error(`Invalid model identifier: ${input}`);
  }
  return trimmed;
}

function buildModelBaseUrl(modelFolderId: string): string {
  const basePath = (import.meta.env.BASE_URL ?? '/').toString();
  const normalised = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return new URL(`${normalised}models/${modelFolderId}/`, window.location.origin).toString();
}

function buildToolDefinitions(): ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'list_activities',
        description:
          'Search catalog.activities for activity entries that match the provided keyword. Use this to discover valid emission factors and schedules.',
        parameters: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Case-insensitive search term applied to activity identifiers, titles, and related metadata.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 20,
              description: 'Maximum number of matches to return (default 8).',
            },
          },
          required: ['keyword'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_profiles',
        description:
          'Search catalog.profiles for lifestyle profiles or bundles that match the provided keyword. Use this before recommending profile-level changes.',
        parameters: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Case-insensitive search term applied to profile identifiers, titles, and summaries.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 20,
              description: 'Maximum number of matches to return (default 8).',
            },
          },
          required: ['keyword'],
        },
      },
    },
  ];
}

function convertToolCalls(toolCalls: readonly MsgToolCall[]): ChatCompletionMessageToolCall[] {
  return toolCalls.map((toolCall) => ({
    id: toolCall.id,
    type: 'function',
    function: {
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    },
  } satisfies ChatCompletionMessageToolCall));
}

function findMatchingModelRecord(candidateIds: Set<string>): ModelRecord | null {
  const normalisedCandidates = new Set<string>(
    Array.from(candidateIds)
      .map((id) => normaliseModelId(id))
      .filter((id) => id.length > 0),
  );

  for (const record of prebuiltAppConfig.model_list) {
    if (normalisedCandidates.has(normaliseModelId(record.model_id))) {
      return record;
    }
  }

  return null;
}

function normaliseModelId(value: string): string {
  return value.replace(/[^A-Za-z0-9]+/g, '').toLowerCase();
}

function resolveModelLibUrl(candidate: string, baseUrl: string): string | null {
  if (!candidate) {
    return null;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    const fileName = url.pathname.split('/').pop();
    if (!fileName || !fileName.endsWith('.wasm')) {
      return null;
    }
    return new URL(fileName, baseUrl).toString();
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractAssistantContent(message: ChatCompletionAssistantMessageParam): string {
  const { content } = message;
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const parts = content as Array<ChatCompletionContentPart | string>;
    return parts
      .map((part) => normaliseContentPart(part))
      .join('')
      .trim();
  }

  return '';
}

function normaliseContentPart(part: ChatCompletionContentPart | string): string {
  if (typeof part === 'string') {
    return part;
  }

  if (part.type === 'text') {
    const textPart = part as ChatCompletionContentPartText;
    return textPart.text;
  }

  return '';
}

function stringifyToolResult(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJSON(content: string): unknown {
  const trimmed = content.trim();
  const withoutFence = trimmed.startsWith('```')
    ? trimmed.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
    : trimmed;
  return JSON.parse(withoutFence);
}

function normaliseIntentEdit(entry: unknown): IntentEdit | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const action = pickFirstString(record, ['action', 'type', 'operation']);
  if (!action) {
    console.warn('[LocalLLMAdapter] Dropping edit without an action field', record);
    return null;
  }

  const target = pickFirstString(record, ['target', 'id', 'activity_id', 'profile_id']);
  const value =
    'value' in record
      ? record.value
      : 'payload' in record
        ? record.payload
        : 'data' in record
          ? record.data
          : undefined;

  const metadata: Record<string, unknown> = {};
  if (record.metadata && typeof record.metadata === 'object') {
    Object.assign(metadata, record.metadata as Record<string, unknown>);
  }
  if (typeof record.reason === 'string' && record.reason.trim()) {
    metadata.reason = record.reason.trim();
  }

  for (const [key, val] of Object.entries(record)) {
    if (
      key === 'action' ||
      key === 'type' ||
      key === 'operation' ||
      key === 'target' ||
      key === 'id' ||
      key === 'activity_id' ||
      key === 'profile_id' ||
      key === 'value' ||
      key === 'payload' ||
      key === 'data' ||
      key === 'metadata' ||
      key === 'reason'
    ) {
      continue;
    }
    if (!(key in metadata)) {
      metadata[key] = val;
    }
  }

  const edit: IntentEdit = {
    action: action.trim(),
    ...(target ? { target: target.trim() } : {}),
    ...(value !== undefined ? { value } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };

  return edit;
}

function pickFirstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function buildSearchResult<T extends Record<string, unknown>>(
  keyword: string,
  limit: number,
  matches: readonly CatalogMatch<T>[],
  source: string,
): CatalogSearchResult<T> {
  const boundedLimit = Math.max(1, Math.min(limit, 20));
  return {
    keyword,
    limit: boundedLimit,
    total: matches.length,
    matches: matches.slice(0, boundedLimit),
    source,
  };
}

function searchCatalogRecords<T extends Record<string, unknown>>(
  records: readonly T[],
  keyword: string,
  options: SearchOptions<T>,
): CatalogMatch<T>[] {
  const normalisedKeyword = keyword.trim().toLowerCase();
  const results: CatalogMatch<T>[] = [];

  for (const record of records) {
    const id = options.getId(record);
    if (!id) {
      continue;
    }

    const label = options.getLabel(record) ?? id;
    const summary = options.getSummary ? options.getSummary(record) : null;
    const extraTerms = options.getExtraTerms ? options.getExtraTerms(record) : [];

    const haystackParts = [id, label, summary, ...extraTerms];
    const haystack = haystackParts
      .filter((part): part is string => typeof part === 'string')
      .map((part) => part.toLowerCase())
      .join(' \n ');

    if (normalisedKeyword && !haystack.includes(normalisedKeyword)) {
      continue;
    }

    const keywordIndex = normalisedKeyword ? haystack.indexOf(normalisedKeyword) : 0;
    const hasPrefixMatch =
      normalisedKeyword.length > 0 &&
      label
        .toLowerCase()
        .split(/\s+/)
        .some((token) => token.startsWith(normalisedKeyword));

    const data = cloneSerializable(record);
    results.push({
      id,
      label,
      summary: summary ?? undefined,
      data,
      keywordIndex: keywordIndex >= 0 ? keywordIndex : Number.MAX_SAFE_INTEGER,
      hasPrefixMatch,
    });
  }

  results.sort((a, b) => {
    if (a.hasPrefixMatch !== b.hasPrefixMatch) {
      return a.hasPrefixMatch ? -1 : 1;
    }
    if (a.keywordIndex !== b.keywordIndex) {
      return a.keywordIndex - b.keywordIndex;
    }
    const labelCompare = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    if (labelCompare !== 0) {
      return labelCompare;
    }
    return a.id.localeCompare(b.id, undefined, { sensitivity: 'base' });
  });

  return results;
}

function cloneSerializable<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function getActivityId(activity: CatalogActivity): string | null {
  return pickFirstString(activity, ['activity_id', 'id', 'slug', 'short_id']);
}

function getActivityLabel(activity: CatalogActivity): string | null {
  return pickFirstString(activity, ['title', 'name', 'label']);
}

function getActivitySummary(activity: CatalogActivity): string | null {
  return pickFirstString(activity, ['summary', 'description', 'notes']);
}

function getActivityExtraTerms(activity: CatalogActivity): readonly string[] {
  return collectStringValues(activity, ['layer', 'layers', 'tags', 'keywords', 'aliases']);
}

function getProfileId(profile: CatalogProfile): string | null {
  return pickFirstString(profile, ['profile_id', 'id', 'slug', 'short_id']);
}

function getProfileLabel(profile: CatalogProfile): string | null {
  return pickFirstString(profile, ['title', 'name', 'label']);
}

function getProfileSummary(profile: CatalogProfile): string | null {
  return pickFirstString(profile, ['summary', 'description', 'notes']);
}

function getProfileExtraTerms(profile: CatalogProfile): readonly string[] {
  return collectStringValues(profile, ['tags', 'keywords', 'aliases', 'segments']);
}

function collectStringValues(record: Record<string, unknown>, keys: readonly string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      values.push(value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim().length > 0) {
          values.push(item);
        }
      }
    }
  }
  return values;
}
