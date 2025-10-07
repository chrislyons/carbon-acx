export interface MsgToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string;
  };
}

export type MsgRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Msg {
  readonly role: MsgRole;
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
  readonly toolCalls?: readonly MsgToolCall[];
}

export interface IntentEdit {
  readonly action: string;
  readonly target?: string;
  readonly value?: unknown;
  readonly metadata?: Record<string, unknown>;
}

export interface Intent {
  readonly edits: readonly IntentEdit[];
  readonly explanation: string;
}

export interface Interpreter {
  interpret(messages: readonly Msg[]): Promise<Intent>;
}
