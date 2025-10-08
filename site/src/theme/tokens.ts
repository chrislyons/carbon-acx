export const SHELL_LAYOUT_STORAGE_KEY = 'acx:shell:layout';

export const SHELL_MIN_LEFT_FRACTION = 0.16;
export const SHELL_MAX_LEFT_FRACTION = 0.4;
export const SHELL_MIN_RIGHT_FRACTION = 0.16;
export const SHELL_MAX_RIGHT_FRACTION = 0.36;
export const SHELL_MIN_MAIN_FRACTION = 0.36;

export const SHELL_KEYBOARD_RESIZE_STEP = 0.02;

export const SHELL_MIN_DOCK_FRACTION = 0.2;
export const SHELL_MAX_DOCK_FRACTION = 0.6;
export const SHELL_DEFAULT_DOCK_FRACTION = 0.33;
export const SHELL_DEFAULT_DOCK_POSITION = 'side' as const;
export type ShellDockPosition = typeof SHELL_DEFAULT_DOCK_POSITION | 'bottom';

export interface ShellLayoutPreset {
  query: string;
  left: number;
  right: number;
}

export const SHELL_LAYOUT_PRESETS: ShellLayoutPreset[] = [
  { query: '(min-width: 1920px)', left: 0.24, right: 0.28 },
  { query: '(min-width: 1600px)', left: 0.24, right: 0.26 },
  { query: '(min-width: 1440px)', left: 0.26, right: 0.24 },
  { query: '(min-width: 1280px)', left: 0.28, right: 0.22 },
  { query: '', left: 0.3, right: 0.2 }
];

export const SHELL_HEADER_MAX_HEIGHT = 64;
export const SHELL_DIVIDER_WIDTH = 12;
