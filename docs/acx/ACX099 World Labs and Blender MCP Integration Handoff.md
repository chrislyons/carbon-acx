---
related:
  - ACX
---

# ACX099 World Labs and Blender MCP Integration Handoff

**Date:** 2026-01-25
**Status:** Handoff Document
**Purpose:** Enable agent pickup of Carbon ACX work with new MCP tools

---

## Project Context

**Carbon ACX** is an open reference stack for trustworthy carbon accounting. It converts auditable CSV inputs into reproducible datasets and ships interactive disclosures.

| Attribute | Value |
|-----------|-------|
| Location | `~/dev/carbon-acx/` |
| Stack | Python backend + Next.js 15 frontend + React Three Fiber |
| Branch | `feature/nextjs-rebuild` (check if exists) |
| Progress | 67% through strategic rebuild (Phases 1-3 complete) |

---

## Current State: STALLED

The rebuild has been inactive since Nov 10. Key issues:

| Issue | Status | Action Needed |
|-------|--------|---------------|
| **Phase 4 blocked** | PR #248 targets wrong branch | Port or close PR |
| **Legacy app** | 5.3 MB scheduled for deletion | Delete `apps/carbon-acx-web-legacy/` |
| **Test coverage** | 0% | Defer or sprint |
| **Unused deps** | 450 KB bloat | Remove 9 packages |

---

## 3D Visualization: DataUniverse

Working component at `apps/carbon-acx-web/src/components/viz/DataUniverse.tsx`:

- Route: `/explore/3d`
- Central sphere = total emissions (logarithmic size)
- Orbiting spheres = activities (color-coded by intensity)
- Camera choreography: intro zoom + click-to-fly
- React Three Fiber + Drei (React 19 workaround active)

---

## NEW TOOLS AVAILABLE

### World Labs MCP v2.0 (14 tools)

**Already configured in `.mcp.json`** — just reload MCP servers.

Key tools for carbon-acx:

| Tool | Use Case |
|------|----------|
| `world_generate_from_text` | Generate 3D carbon footprint worlds |
| `world_batch_generate` | Create scenario variations (current/net-zero/business-as-usual) |
| `world_list` | Find existing generated worlds |
| `world_update` | Tag worlds by scenario/sector |

**Example prompts for carbon visualization:**

```
# Supply chain landscape
"Industrial supply chain showing coal to electricity, factories emitting smoke, power lines, with carbon intensity shown through color temperature"

# Net-zero scenario
"Renewable energy landscape with solar panels, wind turbines, green buildings, clear blue sky, sustainable city"

# Current state scenario
"Urban industrial landscape with traffic, factories, brown smog, showing high carbon emissions"
```

**Async workflow for long generations:**

```javascript
world_generate_from_text({
  prompt: "...",
  wait: false,  // Don't block
  display_name: "Carbon Scenario: Net Zero 2050",
  tags: ["carbon-acx", "scenario", "net-zero"],
  seed: 42  // Reproducible
})
// Returns operation_id
// Continue other work
// Later: world_poll_operations({ operation_ids: [...] })
```

### Blender MCP

**Also configured in `.mcp.json`**.

Use for:
- Creating custom 3D assets (factory, solar panel, car icons)
- Exporting GLTF models for DataUniverse
- Higher quality than procedural spheres

Key tools:
- `mcp__blender__execute_blender_code` — Run Python in Blender
- `mcp__blender__get_viewport_screenshot` — Preview work
- `mcp__blender__search_polyhaven_assets` — Find textures/HDRIs

---

## Recommended Integration Points

### 1. `/explore/worlds` Route (NEW)

Add World Labs gallery alongside DataUniverse:
- Display generated carbon scenario worlds
- Video players for World Labs outputs
- Compare current vs net-zero scenarios

### 2. Enhance DataUniverse Backgrounds

- Use World Labs to generate immersive backdrops
- Replace generic stars with carbon-themed environments

### 3. Manifest Provenance Visualization

- Generate supply chain "landscapes" showing emission sources
- Embed in manifest detail modal (Phase 4 work)

### 4. Blender-Created Activity Icons

- Replace procedural spheres with recognizable 3D icons
- Car for transport, factory for industrial, solar panel for renewable

---

## First Steps

### 1. Assess current state

```bash
cd ~/dev/carbon-acx
git status
git branch --list | grep -E "(feature|rebuild)"
git log --oneline -10
```

### 2. Review key docs

- `docs/acx/ACX098 Bloat Remediation Recommendations.md`
- `docs/acx/ACX094 Phase 3 3D Visualization Implementation Report.md`
- `docs/acx/ACX093 Strategic Frontend Rebuild Specification.md`

### 3. Quick cleanup (optional but recommended)

- Delete `apps/carbon-acx-web-legacy/`
- Remove unused deps per ACX098

### 4. Test World Labs MCP

```javascript
world_generate_from_text({
  prompt: "Carbon accounting dashboard floating in space, holographic displays showing emission data",
  display_name: "Carbon ACX Concept",
  tags: ["carbon-acx", "concept-art"],
  wait: false
})
```

### 5. Plan enhancement

- Choose integration point (worlds route, backgrounds, or assets)
- Create ACX100 spec document
- Implement

---

## Key Files

| Purpose | Path |
|---------|------|
| 3D Component | `apps/carbon-acx-web/src/components/viz/DataUniverse.tsx` |
| 3D Route | `apps/carbon-acx-web/src/app/explore/3d/page.tsx` |
| MCP Config | `.mcp.json` |
| Rebuild Spec | `docs/acx/ACX093 Strategic Frontend Rebuild Specification.md` |
| Bloat Audit | `docs/acx/ACX098 Bloat Remediation Recommendations.md` |
| CLAUDE.md | `CLAUDE.md` |

---

## Decision Required

Before starting work, clarify with user:

1. **Rebuild status**: Resume Phase 4, or focus on enhancement?
2. **World Labs priority**: New `/explore/worlds` route, or enhance existing DataUniverse?
3. **Cleanup first?**: Execute ACX098 bloat remediation before new features?

---

## Verification Checklist

Agent can verify handoff is complete by:

- [ ] Running `git status` in carbon-acx
- [ ] Confirming World Labs MCP tools are available (`/mcp`)
- [ ] Testing a simple world generation
- [ ] Reading this document and related docs

---

## References

- [ACX093] Strategic Frontend Rebuild Specification
- [ACX094] Phase 3 3D Visualization Implementation Report
- [ACX096] Strategic Rebuild Progress Audit
- [ACX098] Bloat Remediation Recommendations
- [WLD] World Labs MCP Server Documentation (`~/dev/worlds/CLAUDE.md`)
