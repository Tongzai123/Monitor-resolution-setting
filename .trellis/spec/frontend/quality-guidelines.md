# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

(To be filled by the team)

---

## Testing Requirements

<!-- What level of testing is expected -->

### Electron Native Dependency Packaging

Follow [Electron Packaging Guidelines](./electron-packaging.md) before shipping
any installer that includes local or native Node dependencies. Native rebuild
success is not enough; the installed app must contain both the dependency's
JavaScript `package.json.main` entry and the native `.node` binary.

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)
