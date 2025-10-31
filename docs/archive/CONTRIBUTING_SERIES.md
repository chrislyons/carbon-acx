# Contributing Series

## Purpose
The contributing series documents how changes trace back to their originating specifications, prompts, and review artifacts. It helps reviewers and maintainers verify that every change cites the governing spec and the execution prompt responsible for the implementation.

## Serial systems
ACX### identifiers reference written specifications, while CDX### identifiers reference execution prompts, typically used for agent workflows. Pull request numbers (`#123`) remain GitHub's canonical change artifact. ACX### identifies specs; CDX### identifies prompts; PR # is GitHub’s artifact. Every PR must include both ACX and CDX where applicable.

## How to cite ACX/CDX in commits/PRs
Include both the applicable ACX and CDX serials in commit messages and pull request summaries. Reference the PR number once GitHub assigns it, ensuring the triad (ACX, CDX, PR #) can be cross-referenced. For follow-up commits, continue citing the same ACX/CDX pair unless a new spec or prompt supersedes them.

## Examples
- Commit message: `docs(conventions): codify lineage metadata (CDX001, implements ACX017)`
- Pull request summary: `Implements (spec): ACX017` and `Prompt (execution): CDX001`
- Follow-up hotfix: `fix(conventions): correct lineage appendix link (CDX001, implements ACX017)`
