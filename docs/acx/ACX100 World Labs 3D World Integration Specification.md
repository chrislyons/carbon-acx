---
related:
  - 3d-data-visualization
  - 3d_visualization_supports_understanding
  - spatial_interfaces_require_new_navigation_paradigms
  - ACX
---

# ACX100 World Labs 3D World Integration Specification

**Date:** 2026-01-25
**Status:** Active
**Depends On:** ACX099 (Handoff), ACX094 (3D Visualization)
**Priority:** Enhancement

---

## Executive Summary

Integrate World Labs AI-generated 3D worlds into Carbon ACX to provide immersive carbon scenario visualizations. This enhancement adds a `/explore/worlds` route to display AI-generated carbon landscapes alongside the existing DataUniverse 3D visualization.

---

## Scope

### In Scope

1. **New `/explore/worlds` route** - Gallery view of World Labs generated worlds
2. **Carbon scenario presets** - Pre-defined prompts for common scenarios
3. **World Labs MCP integration** - Async generation workflow
4. **Video player component** - Display World Labs output videos

### Out of Scope (Future Work)

- Blender MCP custom assets (requires Blender addon running)
- DataUniverse backdrop replacement (Phase 2)
- Real-time world generation from manifest data (Phase 3)

---

## Technical Design

### 1. Route Structure

```
apps/carbon-acx-web/src/app/
├── explore/
│   ├── 3d/
│   │   └── page.tsx          # Existing DataUniverse
│   └── worlds/
│       ├── page.tsx          # NEW: World gallery
│       └── [worldId]/
│           └── page.tsx      # NEW: Individual world view
```

### 2. World Labs MCP Integration

**Available Tools (from .mcp.json):**

| Tool | Purpose |
|------|---------|
| `world_generate_from_text` | Generate world from prompt |
| `world_batch_generate` | Create multiple scenario variations |
| `world_list` | Retrieve existing worlds |
| `world_update` | Add tags/metadata to worlds |
| `world_poll_operations` | Check async generation status |

**Generation Workflow:**

```typescript
// 1. Start async generation
const operation = await world_generate_from_text({
  prompt: "Industrial supply chain with factories, power lines, coal plants",
  display_name: "Carbon Scenario: Current State",
  tags: ["carbon-acx", "scenario", "current-state"],
  wait: false,  // Don't block
  seed: 42,     // Reproducible
})

// 2. Poll for completion
const status = await world_poll_operations({
  operation_ids: [operation.id]
})

// 3. Display when ready
if (status.completed) {
  // Video URL available
}
```

### 3. Carbon Scenario Presets

| Scenario | Description | Prompt Template |
|----------|-------------|-----------------|
| **Current State** | High-emission industrial landscape | "Urban industrial landscape with factories, traffic, brown smog, coal power plants" |
| **Net Zero 2050** | Renewable energy future | "Sustainable city with solar panels, wind turbines, green buildings, clear skies" |
| **Supply Chain** | Emission sources visualization | "Global supply chain showing factories, shipping ports, cargo ships, data centers" |
| **Individual Footprint** | Personal carbon activities | "Modern home with car, appliances, food, showing energy consumption" |

### 4. Component Architecture

```
components/
├── worlds/
│   ├── WorldGallery.tsx        # Grid of world thumbnails
│   ├── WorldCard.tsx           # Individual world preview
│   ├── WorldPlayer.tsx         # Video player for world
│   ├── WorldGenerator.tsx      # UI for generating new worlds
│   └── ScenarioSelector.tsx    # Preset scenario picker
```

### 5. State Management

```typescript
// stores/worldsStore.ts
interface WorldsState {
  worlds: World[]
  pendingOperations: Operation[]
  isGenerating: boolean
  selectedWorldId: string | null

  // Actions
  fetchWorlds: () => Promise<void>
  generateWorld: (prompt: string, options: GenerateOptions) => Promise<void>
  pollOperations: () => Promise<void>
}
```

---

## Implementation Phases

### Phase 1: Gallery Foundation (This Sprint)

1. Create `/explore/worlds` route with placeholder
2. Add WorldGallery component
3. Implement World Labs MCP client wrapper
4. Display existing worlds from `world_list`

### Phase 2: Generation UI

1. Add WorldGenerator component
2. Implement ScenarioSelector with presets
3. Async generation with progress indicator
4. Auto-refresh on completion

### Phase 3: Enhanced Visualization

1. Video player with controls
2. Comparison view (current vs net-zero)
3. Link worlds to manifest data
4. Export/share functionality

---

## API Integration

### MCP Client Wrapper

```typescript
// lib/worldLabs.ts
export class WorldLabsClient {
  async generateWorld(options: GenerateOptions): Promise<Operation> {
    // Calls world_generate_from_text via MCP
  }

  async listWorlds(tags?: string[]): Promise<World[]> {
    // Calls world_list via MCP
  }

  async pollStatus(operationIds: string[]): Promise<OperationStatus[]> {
    // Calls world_poll_operations via MCP
  }
}
```

### Types

```typescript
interface World {
  id: string
  displayName: string
  tags: string[]
  videoUrl?: string
  thumbnailUrl?: string
  createdAt: string
  prompt: string
  seed?: number
}

interface Operation {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  worldId?: string
  error?: string
}
```

---

## UI/UX Requirements

### Design Tokens (from CLAUDE.md)

- **Spacing:** 8px gaps between cards, 16px section spacing
- **Typography:** 14px base, General Sans
- **Colors:** Dark theme matching DataUniverse (`#0a0e27` background)

### Gallery Layout

```
+--------------------------------------------------+
|  Carbon Worlds                    [+ Generate]   |
+--------------------------------------------------+
|  [Current State]  [Net Zero]  [Supply Chain]     |  <- Scenario filters
+--------------------------------------------------+
|  +------------+  +------------+  +------------+  |
|  |            |  |            |  |            |  |
|  |   World    |  |   World    |  |   World    |  |
|  |  Preview   |  |  Preview   |  |  Preview   |  |
|  |            |  |            |  |            |  |
|  +------------+  +------------+  +------------+  |
|  | Name       |  | Name       |  | Name       |  |
|  | 2.5t CO2   |  | 0.8t CO2   |  | 12t CO2    |  |
|  +------------+  +------------+  +------------+  |
+--------------------------------------------------+
```

---

## Validation Checklist

- [ ] World Labs MCP tools accessible (`/mcp` shows worlds server)
- [ ] `world_list` returns existing worlds
- [ ] Gallery page renders without SSR errors
- [ ] Video player works with World Labs output format
- [ ] Generation workflow completes successfully
- [ ] Error states handled gracefully

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| World Labs MCP | Configured | Reload MCP servers if tools not available |
| Blender MCP | Configured | Requires Blender addon running |
| DataUniverse | Complete | ACX094 |
| Next.js 15 | Active | SSR safety required |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| World Labs API rate limits | Cache generated worlds, batch requests |
| Long generation times (2-5 min) | Async workflow, progress UI, polling |
| MCP server not connected | Graceful degradation, connection status indicator |
| Large video files | Lazy loading, thumbnail previews |

---

## Success Metrics

1. **Technical:** Gallery page loads in <2s, generation completes successfully
2. **UX:** Users can generate and view carbon scenario worlds
3. **Integration:** Worlds display alongside DataUniverse in explore section

---

## References

- [ACX099] World Labs and Blender MCP Integration Handoff
- [ACX094] Phase 3 3D Visualization Implementation Report
- [ACX093] Strategic Frontend Rebuild Specification
- World Labs MCP Server Documentation (`~/dev/worlds/CLAUDE.md`)

---

**Next Steps:**
1. Reload MCP servers to access World Labs tools
2. Implement Phase 1 gallery foundation
3. Test world generation workflow
4. Create placeholder UI for coming enhancements
