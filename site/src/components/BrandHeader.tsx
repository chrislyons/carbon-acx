export interface BrandHeaderProps {
  landmark?: 'banner' | 'heading';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function BrandHeader({ landmark = 'banner', level = 2 }: BrandHeaderProps): JSX.Element {
  if (landmark === 'banner') {
    return (
      <header role="banner" aria-label="Carbon ACX" className="px-3 py-2 text-sm font-semibold select-none">
        Carbon ACX
      </header>
    );
  }
  return (
    <div role="heading" aria-level={level} aria-label="Carbon ACX" className="px-3 py-2 text-sm font-semibold select-none">
      Carbon ACX
    </div>
  );
}

export default BrandHeader;
