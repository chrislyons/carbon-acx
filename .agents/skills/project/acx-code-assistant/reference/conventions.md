# Carbon ACX Code Conventions

This document defines coding standards, patterns, and conventions for the Carbon ACX repository.

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript/JavaScript](#typescriptjavascript)
3. [Python](#python)
4. [React Components](#react-components)
5. [Cloudflare Workers](#cloudflare-workers)
6. [Testing](#testing)
7. [File Organization](#file-organization)

---

## General Principles

### Code Quality Standards

1. **Readability First:** Code is read more than written - prioritize clarity
2. **Type Safety:** Use TypeScript strict mode, Pydantic for Python
3. **Error Handling:** Always handle errors gracefully, never silent failures
4. **Documentation:** Complex functions get JSDoc/docstrings
5. **No Magic Numbers:** Use named constants
6. **DRY (Don't Repeat Yourself):** Extract common patterns

### From AGENTS.md

**Review Gates:**
- All AI-generated code must be labeled with `ai-generated` PR tag
- Commit footer: `Generated-by: claude-code`
- Changes to `wrangler.toml`, `.github/workflows/`, `Makefile` require explicit approval
- No secrets in code or prompts

**Allowed Areas:**
- ✅ TypeScript/JavaScript/CSS/HTML in `app/`, `apps/`, `site/`
- ✅ Python in `calc/`, `scripts/`
- ✅ Tests in `tests/`
- ✅ Documentation and inline comments

**Needs Extra Review:**
- ⚠️ Cloudflare Worker configs
- ⚠️ CI/CD workflows
- ⚠️ Build system files

---

## TypeScript/JavaScript

### Configuration

- **TypeScript:** ~5.5.4 with strict mode enabled
- **Module System:** ESM (import/export)
- **Target:** ES2022
- **Linter:** ESLint
- **Formatter:** Prettier (line length: 100)

### Naming Conventions

```typescript
// Files: kebab-case
// carbon-data-service.ts
// emission-calculator.ts

// Components: PascalCase
export const EmissionChart: React.FC<Props> = () => { ... };

// Functions/variables: camelCase
const calculateEmissions = (activity: Activity) => { ... };

// Constants: SCREAMING_SNAKE_CASE
const MAX_EMISSION_THRESHOLD = 1000;

// Types/Interfaces: PascalCase
interface EmissionFactor {
  activity_id: string;
  value_kg_co2e: number;
}

// Enums: PascalCase for enum, SCREAMING_SNAKE_CASE for values
enum Layer {
  PROFESSIONAL = 'professional',
  ONLINE = 'online',
  INDUSTRIAL_LIGHT = 'industrial_light',
}
```

### Type Definitions

**Always define types:**
```typescript
// ✅ Good
interface Activity {
  activity_id: string;
  name: string;
  emission_factor?: number;  // Optional: use ? not | undefined
  unit: string;
}

// ❌ Bad - any type
function processActivity(activity: any) { ... }
```

**Use strict null checking:**
```typescript
// ✅ Good
const factor: number | null = getEmissionFactor(id);
if (factor === null) {
  throw new Error('Emission factor not found');
}

// ❌ Bad - assumes non-null
const factor = getEmissionFactor(id)!;  // Don't use ! unless absolutely necessary
```

### Error Handling

```typescript
// ✅ Good - specific errors
class DataNotFoundError extends Error {
  constructor(activityId: string) {
    super(`Activity not found: ${activityId}`);
    this.name = 'DataNotFoundError';
  }
}

// ✅ Good - try/catch with typed errors
try {
  const data = await fetchEmissionData(id);
  return processData(data);
} catch (error) {
  if (error instanceof DataNotFoundError) {
    console.warn('Data not found, using fallback');
    return fallbackData;
  }
  throw error;  // Re-throw unexpected errors
}
```

### Async/Await

```typescript
// ✅ Good - async/await
async function loadActivities(): Promise<Activity[]> {
  const response = await fetch('/api/activities');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// ❌ Bad - promise chains (avoid)
function loadActivities() {
  return fetch('/api/activities')
    .then(r => r.json())
    .catch(e => console.error(e));
}
```

---

## Python

### Configuration

- **Version:** 3.11+
- **Linter:** Ruff
- **Formatter:** Black (line length: 100)
- **Type Checking:** Pydantic for runtime validation
- **Package Manager:** Poetry

### Naming Conventions

```python
# Files: snake_case
# emission_calculator.py
# data_loader.py

# Classes: PascalCase
class EmissionCalculator:
    pass

# Functions/variables: snake_case
def calculate_total_emissions(activities: list[Activity]) -> float:
    pass

# Constants: SCREAMING_SNAKE_CASE
MAX_VINTAGE_AGE_YEARS = 5
DEFAULT_EMISSION_UNIT = "kgCO2e"

# Private: prefix with _
def _internal_helper():
    pass
```

### Type Hints

```python
from typing import Optional
from pathlib import Path
import pandas as pd

# ✅ Good - full type hints
def load_activities(data_dir: Path) -> pd.DataFrame:
    """
    Load activities from CSV file.

    Args:
        data_dir: Path to data directory

    Returns:
        DataFrame with activity data

    Raises:
        FileNotFoundError: If activities.csv is missing
    """
    file_path = data_dir / "activities.csv"
    if not file_path.exists():
        raise FileNotFoundError(f"Activities file not found: {file_path}")
    return pd.read_csv(file_path)

# ❌ Bad - no type hints
def load_activities(data_dir):
    return pd.read_csv(data_dir / "activities.csv")
```

### Pydantic Models

```python
from pydantic import BaseModel, Field

class EmissionFactor(BaseModel):
    """Emission factor for a specific activity."""

    activity_id: str = Field(..., description="Unique activity identifier")
    emission_factor_kg: float = Field(..., gt=0, description="Emission factor in kgCO2e")
    unit: str = Field(..., description="Unit of measurement")
    vintage: int = Field(..., ge=1990, le=2100, description="Data vintage year")
    source_id: Optional[str] = Field(None, description="Data source reference")

    class Config:
        frozen = True  # Immutable
```

### Error Handling

```python
# ✅ Good - specific exceptions
class DataValidationError(ValueError):
    """Raised when data validation fails."""
    pass

def validate_emission_factor(ef: dict) -> EmissionFactor:
    try:
        return EmissionFactor(**ef)
    except ValidationError as e:
        raise DataValidationError(f"Invalid emission factor: {e}") from e
```

---

## React Components

### Component Structure

```typescript
// ✅ Good structure
import React, { useState, useEffect } from 'react';

interface EmissionChartProps {
  activityId: string;
  period?: string;  // Optional props have ?
  onDataLoad?: (data: EmissionData) => void;
}

/**
 * Displays emission trends for a specific activity.
 *
 * @param activityId - Unique identifier for activity
 * @param period - Optional time period filter
 * @param onDataLoad - Callback fired when data loads
 */
export const EmissionChart: React.FC<EmissionChartProps> = ({
  activityId,
  period = 'monthly',  // Default value
  onDataLoad,
}) => {
  const [data, setData] = useState<EmissionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activityId, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchEmissionData(activityId, period);
      setData(result);
      onDataLoad?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState />;

  return (
    <div className="emission-chart">
      {/* Chart rendering */}
    </div>
  );
};
```

### Hooks

```typescript
// Custom hooks start with "use"
function useEmissionData(activityId: string) {
  const [data, setData] = useState<EmissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmissionData(activityId).then(setData).finally(() => setLoading(false));
  }, [activityId]);

  return { data, loading };
}

// Usage
const { data, loading } = useEmissionData(activityId);
```

### Styling

- **Primary:** Tailwind CSS utility classes
- **Avoid:** Inline styles unless absolutely necessary
- **Responsive:** Mobile-first approach

```typescript
// ✅ Good - Tailwind classes
<div className="p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-800">Emissions</h2>
</div>

// ❌ Bad - inline styles (avoid)
<div style={{ padding: '16px', background: 'white' }}>
```

---

## Cloudflare Workers

### Runtime Constraints

**IMPORTANT:** Cloudflare Workers ≠ Node.js

```typescript
// ❌ NOT AVAILABLE in Workers
import fs from 'fs';  // No filesystem
import path from 'path';  // No Node.js path module
process.env.VAR;  // No process.env (use bindings instead)

// ✅ Available in Workers
fetch();  // Web standard fetch
console.log();  // Console logging
crypto.randomUUID();  // Web Crypto API
```

### Request Handling

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route handling
    if (url.pathname === '/api/emissions') {
      return handleEmissions(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleEmissions(request: Request, env: Env): Promise<Response> {
  // Validate method
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',  // Configure per environment
    'Cache-Control': 'public, max-age=3600',
  };

  try {
    const data = await fetchDataFromKV(env);
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers }
    );
  }
}
```

### Bindings

Document required bindings in comments:

```typescript
/**
 * Required bindings (wrangler.toml):
 * - CARBON_DATA: KV namespace for carbon data
 * - ARTIFACTS: R2 bucket for artifacts
 */
interface Env {
  CARBON_DATA: KVNamespace;
  ARTIFACTS: R2Bucket;
}
```

---

## Testing

### Vitest (JavaScript/TypeScript)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmissionCalculator } from './emission-calculator';

describe('EmissionCalculator', () => {
  let calculator: EmissionCalculator;

  beforeEach(() => {
    calculator = new EmissionCalculator();
  });

  it('calculates total emissions correctly', () => {
    const activities = [
      { id: 'A1', emission_factor: 10.5, count: 2 },
      { id: 'A2', emission_factor: 5.2, count: 3 },
    ];

    const total = calculator.calculateTotal(activities);

    expect(total).toBe(36.6);  // (10.5 * 2) + (5.2 * 3)
  });

  it('throws error for invalid emission factor', () => {
    expect(() => {
      calculator.calculateTotal([{ id: 'A1', emission_factor: -5, count: 1 }]);
    }).toThrow('Emission factor must be positive');
  });
});
```

### pytest (Python)

```python
import pytest
from emission_calculator import EmissionCalculator

@pytest.fixture
def calculator():
    return EmissionCalculator()

def test_calculate_total(calculator):
    """Test total emission calculation."""
    activities = [
        {"id": "A1", "emission_factor": 10.5, "count": 2},
        {"id": "A2", "emission_factor": 5.2, "count": 3},
    ]

    total = calculator.calculate_total(activities)

    assert total == pytest.approx(36.6)

def test_invalid_emission_factor(calculator):
    """Test error handling for negative emission factor."""
    with pytest.raises(ValueError, match="Emission factor must be positive"):
        calculator.calculate_total([{"id": "A1", "emission_factor": -5, "count": 1}])
```

---

## File Organization

### Directory Structure

```
carbon-acx/
├── apps/
│   └── carbon-acx-web/
│       ├── src/
│       │   ├── components/      # React components
│       │   ├── lib/            # Utility functions
│       │   ├── types/          # TypeScript type definitions
│       │   └── hooks/          # Custom React hooks
│       └── tests/              # Component tests
├── calc/                       # Python derivation engine
│   ├── derive.py              # Main entry point
│   ├── schemas.py             # Pydantic schemas
│   └── outputs/               # Generated artifacts
├── data/                      # Source CSV files
├── scripts/                   # Maintenance scripts
├── workers/
│   └── compute/
│       ├── index.ts           # Worker entry point
│       └── routes/            # API route handlers
└── tests/                     # Python tests
```

### Import Order

**TypeScript:**
```typescript
// 1. External dependencies
import React, { useState } from 'react';
import { format } from 'date-fns';

// 2. Internal absolute imports
import { EmissionCalculator } from '@/lib/calculations';
import type { Activity } from '@/types/activity';

// 3. Relative imports
import { LoadingSpinner } from '../LoadingSpinner';
import styles from './EmissionChart.module.css';
```

**Python:**
```python
# 1. Standard library
import json
from pathlib import Path
from typing import Optional

# 2. Third-party
import pandas as pd
from pydantic import BaseModel

# 3. Local
from calc.schemas import EmissionFactor
from calc.utils import load_csv
```

---

## Security & Best Practices

### Never Commit Secrets

```typescript
// ❌ Bad - hardcoded secret
const API_KEY = 'sk_live_abc123';

// ✅ Good - use environment/bindings
const API_KEY = env.API_KEY;  // Cloudflare Workers
// or
const API_KEY = import.meta.env.VITE_API_KEY;  // Vite
```

### Input Validation

```typescript
// ✅ Always validate user input
function calculateEmissions(activityId: string, count: number): number {
  if (!activityId || activityId.trim() === '') {
    throw new Error('Activity ID is required');
  }

  if (count < 0) {
    throw new Error('Count must be non-negative');
  }

  // Proceed with calculation...
}
```

### Sanitize Output

```typescript
// ✅ Escape user-provided content in React (automatic)
<div>{userProvidedText}</div>  // React escapes by default

// ⚠️ Be careful with dangerouslySetInnerHTML
// Only use when absolutely necessary and sanitize first
```

---

## References

- TypeScript Handbook: https://www.typescriptlang.org/docs/
- React Docs: https://react.dev
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Pydantic: https://docs.pydantic.dev/
- Vitest: https://vitest.dev/
- pytest: https://docs.pytest.org/
