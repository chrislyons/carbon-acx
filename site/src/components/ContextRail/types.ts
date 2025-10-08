import type { ShellDockPosition } from '@/theme/tokens';

export interface DockController {
  isOpen: boolean;
  isLoading: boolean;
  dockPosition: ShellDockPosition;
  dockFraction: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setDockPosition: (position: ShellDockPosition) => void;
  setDockFraction: (fraction: number) => void;
}

export type ContextRailTab = 'refs' | 'scenario' | 'compare' | 'chat' | 'logs';
