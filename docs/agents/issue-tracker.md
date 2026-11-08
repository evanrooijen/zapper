# Issue tracker: GitHub

Issues and specs live in GitHub Issues in `evanrooijen/zapper`.
Use the `gh` CLI from this repo.

## Conventions

- Before creating an issue, verify the target with
  `gh repo view --json nameWithOwner`.
- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open`, with appropriate label filters.
- Comment: `gh issue comment <number> --body-file <file>`.
- Labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: post the explanation as a comment, then `gh issue close <number>`.
- Link child issues using native GitHub sub-issues when supported.
  Otherwise, put `Part of #<parent>` at the top of the child body.
- Record blockers using native GitHub issue dependencies when supported.
  Otherwise, put `Blocked by: #<number>` at the top of the issue body.
  Work is startable when all blockers are closed.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding

- The map is one issue labelled `wayfinder:map`.
- Child tickets link to the map and use `wayfinder:research`,
  `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- Pick the first open child in map order with no open blockers or assignee.
- Claim with `gh issue edit <number> --add-assignee @me`.
- Resolve by commenting with the answer, closing the child, and adding
  a summary and link to the map's Decisions-so-far.
