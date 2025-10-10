AGENTS.md for carbon-acx

Purpose
Define safe and efficient use of AI assistants (e.g., OpenAI Codex Cloud) within the Carbon ACX repository. Maintain code quality, security, and provenance while enabling AI-assisted development.

⸻

1. Scope
	•	Primary assistant: OpenAI Codex Cloud
	•	Permitted tasks: Component scaffolding, refactors, tests, documentation, typed API clients, small features, data pipelines, deployment boilerplate
	•	Excluded: Secrets, production data, architectural changes without review, or unvetted dependencies

⸻

2. Touchpoints

Domain	Key Files / Dirs
Cloudflare Workers	wrangler.toml, workers/
Build & Packaging	Makefile, package.json, pyproject.toml
CI/CD & Governance	.github/, .github/workflows/, CODEOWNERS
Core Code & Apps	apps/, app/, site/, calc/, scripts/, tests/
Documentation	README.md, docs/


⸻

3. Secrets & Configuration

Never expose tokens or production data in prompts or commits.

Context	Storage Method
Local dev	.env (never committed)
GitHub CI	Settings → Secrets and variables
Cloudflare Workers	wrangler secret put <NAME> or dashboard UI

⸻

4. AI-Generated Code Policy

✅ Allowed Areas
	•	TypeScript / JS / CSS / HTML in app code
	•	Python in calc/ and scripts/
	•	Tests under tests/
	•	Docs and inline comments

⚠️ Needs Review
	•	Makefile, .github/workflows/, wrangler.toml, dependency changes

❌ Disallowed
	•	Secrets handling or rotation
	•	Prompting with private data
	•	Bypassing review gates for deploy-impacting changes
  • Binary files are not permitted in PRs

⸻

5. Review Gate

All AI-generated changes must be human-reviewed.
	•	PR label: ai-generated
	•	Commit footer: Generated-by: openai-codex-cloud
	•	Approval required for changes to: Workers config, CI workflows, build system files, and auth/security code.

⸻

6. Prompting Best Practice
	1.	Define goal and target files.
	2.	State constraints (e.g., Cloudflare Workers runtime, no Node APIs).
	3.	Request small diffs and tests.
	4.	Prefer explicit types and strict mode.
	5.	For Workers code, include runtime notes and bindings list.

⸻

7. Dependencies
	•	Propose dependency updates separately from feature work.
	•	Justify new packages (license, size, maintenance).
	•	Document lockfile update command in PR.

⸻

8. Cloudflare & CI/CD
	•	wrangler.toml is the single source of truth—treat edits as high-risk.
	•	Use binding names for secrets/resources (KV, R2, D1, Queues).
	•	CI workflow changes must be minimal, reversible, and guarded by branch protection.

⸻

9. Coding Standards
	•	Respect existing lint/format/test scripts.
	•	Use docstrings/JSDoc for non-trivial functions.
	•	Prefer small, cohesive PRs with clear rationale.

⸻

10. Traceability & Maintenance
	•	Include context and constraints in PR descriptions.
	•	Link related issues or figures.
	•	Update this document if assistant models, deployment targets, or review rules change.

⸻

Quick Checklist
	•	ai-generated label applied
	•	Tests updated
	•	No secrets exposed
  • No binary files will be inluded in commit
	•	Cloudflare rules respected
	•	Dependency change justified
	•	Human review requested

⸻

Last reviewed: 2025-10-09

⸻

Would you like me to tune this further for the “frontend-agent mode” context—e.g., add brief AI-lint rules or style prompts for UI generation?
