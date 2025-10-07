import DOMPurify from 'dompurify';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useChatStore } from '../state/chat';

interface ChatInterfaceProps {
  suggestions?: string[];
  warmup?: boolean;
}

function MessageBubble({
  content,
  role,
  pending,
}: {
  content: string;
  role: 'user' | 'assistant' | 'system';
  pending?: boolean;
}) {
  const className = useMemo(() => {
    if (role === 'user') {
      return 'self-end bg-blue-600 text-white';
    }
    if (role === 'assistant') {
      return 'self-start bg-slate-100 text-slate-900';
    }
    return 'self-center bg-slate-200 text-slate-700';
  }, [role]);

  const safeHtml = useMemo(() => {
    if (!content) {
      return pending ? '<em>Thinking…</em>' : '';
    }
    return DOMPurify.sanitize(content).replace(/\n/g, '<br />');
  }, [content, pending]);

  return (
    <div
      className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed shadow ${className}`}
      data-testid={`chat-bubble-${role}`}
      role="presentation"
    >
      <span dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </div>
  );
}

function SuggestionChip({ label, onSelect }: { label: string; onSelect: (value: string) => void }) {
  return (
    <button
      type="button"
      className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
      onClick={() => onSelect(label)}
      data-testid="chat-suggestion"
    >
      {label}
    </button>
  );
}

export function ChatInterface({ suggestions = [], warmup = false }: ChatInterfaceProps) {
  const [draft, setDraft] = useState('');
  const { history, send, busy, setWarmup } = useChatStore((state) => ({
    history: state.history,
    send: state.send,
    busy: state.busy,
    setWarmup: state.setWarmup,
  }));
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setWarmup(warmup);
  }, [warmup, setWarmup]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const input = draft.trim();
      if (!input) {
        return;
      }
      await send(input);
      setDraft('');
    },
    [draft, send],
  );

  const handleSuggestion = useCallback(
    (value: string) => {
      setDraft(value);
    },
    [],
  );

  const isDisabled = busy.warmup || busy.resolving || busy.computing;

  return (
    <section className="flex h-full flex-col gap-3">
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-xl bg-white p-4"
        aria-live="polite"
        data-testid="chat-transcript"
      >
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Ask me how to adjust your scenario.</p>
        ) : (
          history.map((entry) => (
            <MessageBubble
              key={entry.id}
              content={entry.content}
              role={entry.role}
              pending={entry.pending}
            />
          ))
        )}
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Suggested prompts">
          {suggestions.map((label) => (
            <SuggestionChip key={label} label={label} onSelect={handleSuggestion} />
          ))}
        </div>
      )}
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="chat-input">
          Chat prompt
        </label>
        <input
          id="chat-input"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder={busy.warmup ? 'Preparing model…' : 'Describe your intent'}
          value={draft}
          disabled={isDisabled}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isDisabled || draft.trim().length === 0}
        >
          Send
        </button>
      </form>
    </section>
  );
}

export default ChatInterface;
