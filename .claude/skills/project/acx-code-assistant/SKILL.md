---
name: acx.code.assistant
description: Generate code scaffolds following Carbon ACX conventions for React components, TypeScript APIs, Cloudflare Workers, Python scripts, and tests.
---

# acx.code.assistant

## Purpose

This skill enables Claude to generate production-ready code for Carbon ACX that adheres to repository conventions, architectural patterns, and quality standards defined in `AGENTS.md`, `CLAUDE.md`, and `CONTRIBUTING.md`.

**Capabilities:**
- Generate React components with proper TypeScript typing
- Create Cloudflare Worker endpoints with runtime constraints
- Scaffold Python data pipeline scripts
- Generate test files (Vitest, pytest)
- Create typed API client code
- Follow monorepo structure (pnpm workspaces)

**Quality Enforcement:**
- All code passes linters (eslint, prettier, ruff, black)
- Includes proper error handling
- TypeScript strict mode compliance
- Includes basic tests
- Follows AGENTS.md review gates

## When to Use

**Trigger Patterns:**
- "Create a React component for displaying emission trends"
- "Generate a Cloudflare Worker endpoint for /api/emissions"
- "Scaffold a Python script to process activity data"
- "Write a test for the EmissionCalculator class"
- "Create a typed API client for the carbon data service"
- "Generate boilerplate for a new layer in the Dash app"

**Do NOT Use When:**
- User asks analytical questions (use `carbon.data.qa`)
- User wants reports (use `carbon.report.gen`)
- User wants to validate schemas (use `schema.linter`)
- Modifying core architecture (requires human design review first)

## Allowed Tools

- `read_file` - Read existing code for context and patterns
- `write_file` - Create new code files
- `edit_file` - Modify existing files (with caution)
- `bash` - Run linters, formatters, tests to verify code quality

**Access Level:** 2 (File Modification - can create/edit code files with human review)

**Tool Rationale:**
- `read_file`: Required to understand existing patterns and conventions
- `write_file`: Required to generate new code files
- `edit_file`: Allowed for targeted edits (must preserve existing logic)
- `bash`: Needed to run quality checks (eslint, pytest, etc.)

**Explicitly Denied:**
- No direct deployment or production changes
- No modifications to `wrangler.toml`, `.github/workflows/`, `Makefile` without explicit user approval (high-risk per AGENTS.md)
- No committing or pushing code (human must review first)

## Expected I/O

**Input:**
- Type: Code generation request
- Format: Natural language description of desired code
- Required Context:
  - What to build (component, endpoint, script, test)
  - Where it fits (file path or module)
  - Key functionality
- Optional Context:
  - Specific technologies/libraries
  - Integration points
  - Edge cases to handle

**Example:**
```
"Create a React component that displays a bar chart of emissions by layer using our existing chart library"
```

**Output:**
- Type: Code file(s) with proper structure
- Format: TypeScript (.tsx, .ts), Python (.py), or JavaScript (.js)
- Location: Appropriate directory per repo structure
- Includes:
  - Proper imports
  - TypeScript types/interfaces
  - Error handling
  - JSDoc/docstring comments
  - Basic test file (separate)
- Validation:
  - Runs through linter without errors
  - Follows naming conventions
  - Includes type safety
  - No TODOs without tracking

## Dependencies

**Required:**
- Access to Carbon ACX repository structure
- Understanding of AGENTS.md conventions
- Knowledge of tech stack:
  - TypeScript 5.5+
  - React 18
  - Vite 5
  - Python 3.11+
  - Cloudflare Workers runtime
- Reference files:
  - `reference/conventions.md` - Coding standards
  - `AGENTS.md` - AI development guidelines
  - `CLAUDE.md` - Repository-specific rules

**Code Quality Tools:**
- ESLint + Prettier (TypeScript/JavaScript)
- Ruff + Black (Python)
- Vitest (JavaScript tests)
- pytest (Python tests)

## Examples

### Example 1: React Component Generation

**User:** "Create a React component for displaying a list of activities with their emission factors"

**Claude Process:**
1. Read existing component patterns (e.g., from `apps/carbon-acx-web/src/components/`)
2. Check conventions in `reference/conventions.md`
3. Generate component with:
   - Proper TypeScript types
   - Props interface
   - Error handling
   - Accessibility attributes
4. Generate companion test file
5. Run prettier/eslint to verify
6. Save to appropriate directory

**Output File:** `apps/carbon-acx-web/src/components/ActivityList.tsx`
```typescript
import React from 'react';

interface Activity {
  activity_id: string;
  name: string;
  emission_factor?: number;
  unit?: string;
}

interface ActivityListProps {
  activities: Activity[];
  onActivitySelect?: (activity: Activity) => void;
}

/**
 * Displays a list of activities with their emission factors
 * @param activities - Array of activity objects
 * @param onActivitySelect - Optional callback when activity is clicked
 */
export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  onActivitySelect,
}) => {
  if (!activities || activities.length === 0) {
    return <p className="text-gray-500">No activities available</p>;
  }

  return (
    <ul className="space-y-2" role="list">
      {activities.map((activity) => (
        <li
          key={activity.activity_id}
          className="p-4 border rounded hover:bg-gray-50 cursor-pointer"
          onClick={() => onActivitySelect?.(activity)}
          role="listitem"
        >
          <div className="font-semibold">{activity.name}</div>
          {activity.emission_factor && (
            <div className="text-sm text-gray-600">
              {activity.emission_factor} kgCO2e/{activity.unit || 'unit'}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};
```

**Test File:** `apps/carbon-acx-web/src/components/ActivityList.test.tsx`
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityList } from './ActivityList';

describe('ActivityList', () => {
  const mockActivities = [
    { activity_id: 'TEST.1', name: 'Test Activity', emission_factor: 1.5, unit: 'hour' },
  ];

  it('renders activities correctly', () => {
    render(<ActivityList activities={mockActivities} />);
    expect(screen.getByText('Test Activity')).toBeInTheDocument();
    expect(screen.getByText(/1.5 kgCO2e/)).toBeInTheDocument();
  });

  it('shows message when no activities', () => {
    render(<ActivityList activities={[]} />);
    expect(screen.getByText(/No activities available/)).toBeInTheDocument();
  });
});
```

### Example 2: Cloudflare Worker Endpoint

**User:** "Create a Cloudflare Worker endpoint at /api/layers that returns all layer data"

**Claude Process:**
1. Read existing Worker code in `workers/compute/index.ts`
2. Understand Cloudflare runtime constraints (no Node.js APIs)
3. Generate endpoint with:
   - Proper error handling
   - CORS headers
   - Input validation
   - Response typing
4. Note binding requirements in comments

**Output File:** `workers/compute/routes/layers.ts`
```typescript
/**
 * GET /api/layers
 * Returns all carbon accounting layers
 *
 * Runtime: Cloudflare Workers (no Node.js APIs)
 * Bindings: None required
 */

interface Layer {
  layer_id: string;
  layer_name: string;
  layer_type: string;
  description: string;
}

export async function handleLayersRequest(request: Request): Promise<Response> {
  // Validate request method
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // In production, this would load from KV or R2
    // For now, return static demo data
    const layers: Layer[] = [
      {
        layer_id: 'professional',
        layer_name: 'Professional Services',
        layer_type: 'civilian',
        description: 'Professional and consumer activities',
      },
      {
        layer_id: 'online',
        layer_name: 'Digital Infrastructure',
        layer_type: 'civilian',
        description: 'Online services and digital operations',
      },
      // Add more layers...
    ];

    return new Response(JSON.stringify({ layers, count: layers.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Adjust for production
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching layers:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Integration Note:** Add route to main Worker in `workers/compute/index.ts`:
```typescript
import { handleLayersRequest } from './routes/layers';

// In fetch handler:
if (url.pathname === '/api/layers') {
  return handleLayersRequest(request);
}
```

### Example 3: Python Data Processing Script

**User:** "Create a Python script to aggregate emission factors by layer"

**Output:** `scripts/aggregate_by_layer.py`
```python
"""
Aggregate emission factors by layer.

Reads activities.csv and emission_factors.csv, then produces a summary
of total emission factors grouped by layer_id.
"""

import pandas as pd
from pathlib import Path


def aggregate_by_layer(data_dir: Path = Path("data")) -> pd.DataFrame:
    """
    Aggregate emission factors by layer.

    Args:
        data_dir: Path to data directory containing CSV files

    Returns:
        DataFrame with columns: layer_id, layer_name, total_ef, activity_count

    Raises:
        FileNotFoundError: If required CSV files are missing
        ValueError: If data validation fails
    """
    # Load data
    activities_path = data_dir / "activities.csv"
    emission_factors_path = data_dir / "emission_factors.csv"
    layers_path = data_dir / "layers.csv"

    if not activities_path.exists():
        raise FileNotFoundError(f"Activities file not found: {activities_path}")

    activities = pd.read_csv(activities_path)
    emission_factors = pd.read_csv(emission_factors_path)
    layers = pd.read_csv(layers_path)

    # Merge activities with emission factors
    merged = activities.merge(
        emission_factors, on="activity_id", how="inner"
    )

    # Aggregate by layer
    aggregated = (
        merged.groupby("layer_id")
        .agg(
            total_ef=("emission_factor_kg", "sum"),
            activity_count=("activity_id", "count"),
        )
        .reset_index()
    )

    # Add layer names
    aggregated = aggregated.merge(
        layers[["layer_id", "layer_name"]], on="layer_id", how="left"
    )

    # Sort by total emission factor descending
    aggregated = aggregated.sort_values("total_ef", ascending=False)

    return aggregated[["layer_id", "layer_name", "total_ef", "activity_count"]]


def main():
    """CLI entry point."""
    result = aggregate_by_layer()

    print("\n=== Emission Factors by Layer ===\n")
    print(result.to_string(index=False))
    print(f"\nTotal activities: {result['activity_count'].sum()}")
    print(f"Total emission factors: {result['total_ef'].sum():.2f} kgCO2e\n")


if __name__ == "__main__":
    main()
```

**Test File:** `tests/test_aggregate_by_layer.py`
```python
import pytest
import pandas as pd
from pathlib import Path
from scripts.aggregate_by_layer import aggregate_by_layer


def test_aggregate_by_layer(tmp_path):
    """Test layer aggregation with mock data."""
    # Create mock CSV files
    activities_data = pd.DataFrame({
        "activity_id": ["A1", "A2", "A3"],
        "layer_id": ["professional", "professional", "online"],
        "name": ["Activity 1", "Activity 2", "Activity 3"],
    })

    ef_data = pd.DataFrame({
        "activity_id": ["A1", "A2", "A3"],
        "emission_factor_kg": [10.5, 20.3, 15.7],
    })

    layers_data = pd.DataFrame({
        "layer_id": ["professional", "online"],
        "layer_name": ["Professional Services", "Digital Infrastructure"],
    })

    # Save to temp directory
    activities_data.to_csv(tmp_path / "activities.csv", index=False)
    ef_data.to_csv(tmp_path / "emission_factors.csv", index=False)
    layers_data.to_csv(tmp_path / "layers.csv", index=False)

    # Run aggregation
    result = aggregate_by_layer(data_dir=tmp_path)

    # Assertions
    assert len(result) == 2
    assert "professional" in result["layer_id"].values
    assert "online" in result["layer_id"].values

    prof_row = result[result["layer_id"] == "professional"].iloc[0]
    assert prof_row["total_ef"] == pytest.approx(30.8)  # 10.5 + 20.3
    assert prof_row["activity_count"] == 2
```

## Limitations

**Scope Limitations:**
- Cannot make architectural decisions (requires human design)
- Cannot modify deployment configs without approval (per AGENTS.md)
- Cannot bypass review gates for security-sensitive code
- Cannot write code using technologies not in the stack

**Code Quality Constraints:**
- Must pass linters (may need manual fixes for edge cases)
- TypeScript strict mode compliance (may require additional type definitions)
- Test coverage expectations (basic tests provided, comprehensive coverage requires expansion)

**Knowledge Boundaries:**
- Code generated based on existing patterns - novel patterns may need review
- Cloudflare Workers runtime constraints must be respected
- Brand/style guidelines from `reference/conventions.md` must be followed

## Validation Criteria

**Success Metrics:**
- ✅ Code compiles/runs without errors
- ✅ Passes linter (eslint, ruff, prettier, black)
- ✅ TypeScript strict mode compliance
- ✅ Includes proper error handling
- ✅ Has basic test coverage
- ✅ Follows naming conventions from `reference/conventions.md`
- ✅ Includes JSDoc/docstrings for complex functions
- ✅ No hardcoded secrets or credentials

**Quality Checks:**
```bash
# TypeScript/JavaScript
pnpm run lint      # ESLint
pnpm run format    # Prettier
pnpm run type-check  # TypeScript compiler

# Python
ruff check .       # Linting
black --check .    # Formatting
pytest tests/      # Tests
```

**Failure Modes:**
- ❌ Linter errors → Fix before completing
- ❌ Type errors → Add proper types
- ❌ No tests → Generate basic test file
- ❌ TODOs without issue links → Remove or link
- ❌ Hardcoded values (should be config) → Parameterize

**Recovery:**
- If linter fails: Run formatter and fix issues
- If types incomplete: Infer from usage or use strict types
- If patterns unclear: Read similar existing code
- If tests fail: Debug and fix before delivery

## Related Skills

**Composes With:**
- `schema.linter` - Validate generated config files
- `carbon.data.qa` - Use to understand data structure before generating data code

**Not a Replacement For:**
- Human code review (per AGENTS.md)
- Architecture decisions
- Deployment operations

## Maintenance

**Owner:** ACX Team
**Review Cycle:** Weekly (high-activity skill)
**Last Updated:** 2025-10-18
**Version:** 1.0.0

**Maintenance Notes:**
- Update `reference/conventions.md` when coding standards change
- Review generated code quality monthly
- Keep examples synchronized with actual codebase patterns
- Update when tech stack versions change (React, TypeScript, Python)
