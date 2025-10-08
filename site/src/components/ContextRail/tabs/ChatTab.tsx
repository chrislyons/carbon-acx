import type { ReactNode } from 'react';

export interface ChatTabProps {
  children?: ReactNode;
}

export default function ChatTab({ children }: ChatTabProps): JSX.Element {
  if (!children) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">Chat thread</p>
        <p>Start a chat to coordinate findings and share context.</p>
      </div>
    );
  }
  return <div className="space-y-3" data-testid="context-rail-chat">{children}</div>;
}
