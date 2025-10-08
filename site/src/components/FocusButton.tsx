import { Maximize2 as MaximizeIcon } from 'lucide-react';

export interface FocusButtonProps {
  pressed: boolean;
  onToggle: () => void;
}

export function FocusButton({ pressed, onToggle }: FocusButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="icon-btn absolute -top-8 right-2"
      aria-pressed={pressed}
      aria-label={pressed ? 'Exit focus mode' : 'Enter focus mode'}
      onClick={onToggle}
      data-testid="shell-focus-toggle"
    >
      <MaximizeIcon aria-hidden />
    </button>
  );
}

export default FocusButton;
