# Activity Icons

This directory contains SVG icons and logos for activity badges in the Carbon ACX application.

## ⚠️ CRITICAL: Citation Requirements

**ALL BRAND-SPECIFIC ICONS (Netflix, Starbucks, Amazon, etc.) REQUIRE CITATIONS**

Using a brand logo without a proper citation for carbon data is **scientifically inaccurate** and **undermines credibility**.

Before adding any brand logo:
1. Find authoritative carbon data specific to that brand/product
2. Add citation URL(s) to the icon registry
3. Verify citation is accessible and reputable
4. Only then add the SVG file

**Generic icons** (car, plane, electricity) don't require citations as they represent categories, not specific brands.

## Icon System

The application uses a multi-tier fallback system for activity icons:

1. **Direct iconUrl** - Custom URL provided in activity data (highest priority)
2. **SVG files** - Brand logos and custom icons stored in this directory (REQUIRES CITATION for brands)
3. **Lucide icons** - Professional icon set for common activity types
4. **Emojis** - Unicode emojis for rapid prototyping
5. **Initial letter** - Fallback to first letter of activity name

## Adding New Icons

### 1. Add SVG File

Place your SVG file in this directory with a descriptive kebab-case name:

```
netflix-logo.svg
amazon-logo.svg
tesla-logo.svg
starbucks-logo.svg
```

### 2. Register in Icon Library

Edit `/src/lib/activityIcons.tsx` and add an entry to the appropriate category:

**For Brand-Specific Icons (WITH CITATIONS):**
```typescript
export const ACTIVITY_ICON_REGISTRY: Record<string, ActivityIconDefinition[]> = {
  streaming: [
    {
      type: 'netflix',
      name: 'Netflix',
      svgPath: 'netflix-logo.svg',       // ← Reference your SVG file
      fallbackIcon: Tv,
      emoji: '📺',
      brandColor: '#E50914',             // ← Netflix brand red
      requiresCitation: true,            // ← REQUIRED for brands
      citations: [                       // ← MUST include URLs
        'https://example.com/netflix-carbon-study',
        'https://company.com/sustainability-report-2024.pdf',
      ],
    },
    // ... more icons
  ],
};
```

**For Generic Icons (No Citation Required):**
```typescript
{
  type: 'car-gasoline',
  name: 'Gasoline Car',
  svgPath: 'car.svg',                    // Optional
  fallbackIcon: Car,
  emoji: '🚗',
  brandColor: '#DC2626',
  // No requiresCitation or citations needed for generic categories
}
```

### 3. Use in Activity Data

Reference the icon type in your activity data:

```typescript
{
  id: 'activity-netflix',
  name: 'Netflix Streaming',
  iconType: 'netflix',  // ← Matches registry type
  // ... other fields
}
```

## SVG Guidelines

- **Format**: SVG files should be clean, optimized vectors
- **Size**: Icons work best at 64x64px or larger
- **Colors**: Single-color SVGs recommended (color can be overridden via CSS)
- **Logos**: Respect brand guidelines when using corporate logos
- **License**: Ensure you have rights to use any logo/icon

## Icon Categories

Current categories in the registry:

- **transport** - Cars, planes, trains, bikes
- **streaming** - Netflix, YouTube, Spotify, Twitch
- **shopping** - Amazon, Walmart, Target
- **energy** - Electricity, solar, gas, heating
- **food** - Beef, chicken, fish, vegetables
- **tech** - Laptops, smartphones, data centers

## Brand Colors

Each icon definition can specify a `brandColor` (hex format) which is used for:
- Background tinting on badges
- Selected state coloring
- Icon colorization (for Lucide icons)

Examples:
- Netflix: `#E50914`
- Amazon: `#FF9900`
- Spotify: `#1DB954`
- Target: `#CC0000`

## Fallback Behavior

If an SVG file is not found, the system automatically falls back to:

1. Lucide icon component (if specified)
2. Emoji representation (if specified)
3. First letter of activity name in a colored circle

This ensures badges always display something meaningful even if assets are missing.

## Example Icon Registration

```typescript
{
  type: 'starbucks',
  name: 'Starbucks Coffee',
  svgPath: 'starbucks-logo.svg',    // SVG file in this directory
  fallbackIcon: Coffee,              // Lucide icon fallback
  emoji: '☕',                        // Emoji fallback
  brandColor: '#00704A',             // Starbucks green
}
```

## Getting Brand Logos

### Free Sources
- [Simple Icons](https://simpleicons.org/) - SVG brand icons
- [Wikimedia Commons](https://commons.wikimedia.org/) - Public domain logos
- [Flaticon](https://www.flaticon.com/) - Icon library (check licenses)

### Official Sources
- Company press kits and brand guidelines
- Direct download from company websites (with permission)

**Important**: Always verify licensing rights before using brand logos in production.

## Validation

The system includes citation validation:

```typescript
import { validateCitations, canUseIcon } from '../lib/activityIcons';

// Check all icons for missing citations
const missing = validateCitations();
if (missing.length > 0) {
  console.warn('Icons missing required citations:', missing);
}

// Check if specific icon can be used
if (!canUseIcon('netflix')) {
  console.error('Cannot use Netflix icon: missing citation');
}
```

**Before production deployment**, run validation to ensure all brand logos have citations.

## Testing Icons

1. Add your SVG file to this directory
2. Register in `activityIcons.tsx` with citations if brand-specific
3. Run `validateCitations()` to verify citation compliance
4. Reference in demo data or test activity
5. View at http://localhost:5173/ during development
6. Verify fallbacks work by temporarily renaming SVG file

## Future Enhancements

Potential improvements to the icon system:

- [ ] Icon sprite sheets for performance
- [ ] Dynamic icon loading via API
- [ ] User-uploadable custom icons
- [ ] Icon search/browser component
- [ ] Animated icon variants
- [ ] Dark mode icon variants
