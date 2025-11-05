# Carbon ACX Examples

This directory contains example implementations demonstrating the Carbon ACX component library and architecture.

## Available Examples

### 1. CanvasExample.tsx
**Focus:** Component library demonstration

Shows how individual components work together:
- `CanvasZone` layout system (hero/insight/detail zones)
- `StoryScene` narrative wrapper
- `HeroChart` ECharts visualization
- Zustand state management
- XState journey machine integration

**Use case:** Understanding component composition and canvas-first layout.

**Key demonstrations:**
- 3-zone canvas layout (70vh hero, 20vh insight, 10vh detail)
- Scene transitions between onboarding and explore states
- ECharts line chart with goal tracking
- Real-time state updates from Zustand store

---

### 2. JourneyExample.tsx
**Focus:** Complete user journey

Demonstrates the full Carbon ACX experience:
- Multi-scene narrative flow (Onboarding → Baseline → Explore)
- XState machine orchestration
- Scene-to-scene transitions
- State persistence across journey

**Use case:** Understanding the complete user experience and journey architecture.

**Key demonstrations:**
- OnboardingScene: 3-step welcome flow with keyboard navigation
- BaselineScene: Activity entry with GaugeProgress feedback
- ExploreScene: Timeline and comparison visualizations
- Debug panel showing journey state and quick actions

---

## Running Examples

### Development Mode

From the repository root:
```bash
pnpm --filter carbon-acx-web dev
```

Or from the app directory:
```bash
cd apps/carbon-acx-web
npm run dev
```

### Using Examples in Your Code

1. Import the example component:
```typescript
import CanvasExample from './examples/CanvasExample';
// or
import JourneyExample from './examples/JourneyExample';
```

2. Render in your app:
```typescript
function App() {
  return <JourneyExample />;
}
```

3. Replace with your own implementation:
- Copy patterns from examples
- Adapt components to your data
- Follow same architectural principles

---

## Example Structure

Each example follows these principles:

### Canvas-First Layout
```typescript
<StoryScene scene="explore" layout="canvas">
  <CanvasZone zone="hero" padding="lg">
    {/* Primary visualization */}
  </CanvasZone>

  <CanvasZone zone="insight" padding="md">
    {/* Supporting context */}
  </CanvasZone>

  <CanvasZone zone="detail" padding="sm" collapsible>
    {/* Drill-down details */}
  </CanvasZone>
</StoryScene>
```

### State Management Pattern
```typescript
// XState for journey flow
const { currentScene, isExplore, viewInsights } = useJourneyMachine();

// Zustand for app state
const { activities, addActivity, getTotalEmissions } = useAppStore();
```

### Design Token Usage
```typescript
// All styling uses CSS custom properties
style={{
  color: 'var(--text-primary)',
  backgroundColor: 'var(--surface-elevated)',
  borderRadius: 'var(--radius-md)',
}}
```

---

## Component Tiers in Examples

### Tier 1: System Primitives
- `Button` - Primary actions, navigation
- `Input` - Form inputs with validation
- `Dialog` - Modals and confirmations

### Tier 2: Canvas Layout
- `CanvasZone` - Viewport-aware containers
- `StoryScene` - Narrative wrappers with progress
- `TransitionWrapper` - Animation wrappers

### Tier 3: Visualizations
- `HeroChart` - Full-viewport ECharts wrapper
- `TimelineViz` - Historical trend visualization
- `ComparisonOverlay` - Side-by-side chart comparison
- `GaugeProgress` - Circular progress gauge

### Domain: Story Scenes
- `OnboardingScene` - Welcome flow
- `BaselineScene` - Baseline establishment
- `ExploreScene` - Data exploration

---

## Customization Guide

### Adapting CanvasExample

1. **Replace chart data:**
```typescript
const chartOption: EChartsOption = {
  // Your custom ECharts configuration
  xAxis: { data: yourDates },
  series: [{ data: yourValues }],
};
```

2. **Modify zones:**
```typescript
<CanvasZone
  zone="hero"
  padding="lg"              // sm | md | lg | xl
  interactionMode="drill"   // explore | compare | drill
  collapsible               // Add expand/collapse
/>
```

3. **Update scene mapping:**
```typescript
const { isYourScene } = useJourneyMachine();

{isYourScene && (
  <StoryScene scene="yourScene" layout="canvas">
    {/* Your content */}
  </StoryScene>
)}
```

### Adapting JourneyExample

1. **Add new scenes:**
```typescript
// In src/scenes/YourScene.tsx
export const YourScene: React.FC<YourSceneProps> = ({ show }) => {
  return (
    <StoryScene scene="yourScene" layout="canvas">
      {/* Scene content */}
    </StoryScene>
  );
};

// In JourneyExample.tsx
{isYourScene && <YourScene show={isYourScene} />}
```

2. **Customize journey flow:**
Edit `src/machines/journeyMachine.ts` to add states and transitions:
```typescript
states: {
  yourScene: {
    on: {
      NEXT_ACTION: 'nextScene',
    },
  },
}
```

3. **Add state management:**
Edit `src/store/appStore.ts` to add domain-specific state:
```typescript
interface AppState {
  yourData: YourDataType[];
  addYourData: (data: YourDataType) => void;
}
```

---

## Best Practices

### Performance
- Use `React.memo` for expensive visualizations
- Memoize ECharts options with `useMemo`
- Debounce resize handlers in charts
- Lazy load scenes not immediately visible

### Accessibility
- Include ARIA labels on interactive elements
- Support keyboard navigation (arrow keys, Enter, Escape)
- Ensure sufficient color contrast
- Provide text alternatives for visualizations

### State Management
- Keep UI state in components (collapsed, hover)
- Keep domain state in Zustand (activities, layers)
- Keep journey state in XState (current scene, progress)
- Avoid prop drilling - use hooks for state access

### Styling
- Always use design tokens (CSS custom properties)
- Never use hardcoded colors, sizes, or timing
- Maintain consistent spacing scale
- Follow tier-based component organization

---

## Troubleshooting

### Charts not rendering
- Verify ECharts is installed: `pnpm list echarts`
- Check container has explicit height
- Ensure chart data is in correct format

### Scenes not transitioning
- Check XState machine configuration
- Verify event names match between machine and hooks
- Use debug panel in JourneyExample to inspect state

### Styles not applying
- Confirm design tokens are loaded (`tokens.css`)
- Check CSS custom property names match
- Verify Tailwind CSS is configured correctly

### State not persisting
- Check Zustand persist middleware configuration
- Verify localStorage is available
- Clear browser cache if using stale data

---

## Next Steps

After understanding these examples:

1. **Build your own scenes** following the established patterns
2. **Create domain-specific visualizations** using Tier 3 components
3. **Extend the journey machine** to match your user flow
4. **Add tests** for your custom components (see Phase 1 Week 3 plan)
5. **Integrate real data** replacing mock data in examples

---

## References

- **ACX080.md** - Complete rebuild strategy and architecture
- **Component Library** - `src/components/` for all reusable components
- **State Management** - `src/store/appStore.ts` and `src/machines/journeyMachine.ts`
- **Design Tokens** - `src/styles/tokens.css` for theming system
- **Storybook** - Run `npm run storybook` for component documentation

---

**Last Updated:** 2025-10-25 (Phase 1 Week 3 completion)
