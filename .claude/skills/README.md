# Carbon ACX Skills

Skills are automatically loaded into every Claude Code conversation. Just ask natural questions and the relevant skill will activate.

## Available Skills

### carbon.data.qa
Answer analytical questions about carbon accounting data using internal datasets and APIs.

**How to use:**
- "What's the emission factor for coffee production?"
- "Show me activity data for Toronto subway"
- "What's the kgCO2e for a 12oz hot coffee?"

### carbon.report.gen
Generate structured carbon reports automatically.

**How to use:**
- "Generate a monthly emissions report"
- "Create a quarterly compliance report"
- "Build a report for Q3 2024"

### acx.code.assistant
Generate code following Carbon ACX conventions.

**How to use:**
- "Create a new React component for emissions display"
- "Scaffold an API endpoint for /api/emissions"
- "Write tests for the intensity calculator"

### schema.linter
Validate structured data files.

**How to use:**
- "Validate my JSON config"
- "Check this YAML file for errors"
- "Lint the manifest.json schema"

### dependency.audit
Scan for vulnerable dependencies and license issues.

**How to use:**
- "Check for vulnerable npm packages"
- "Audit Python dependencies"
- "Scan for license compliance issues"

## How Skills Work

Skills provide passive guidance as you work. They don't execute tasks automatically—they help you understand requirements and validate your work in real-time.

**Think of skills as expert advisors sitting next to you while you code.**

For automated task execution, use **Agents** (see `.claude/agents/`).
