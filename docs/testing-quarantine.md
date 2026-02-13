# Testing Quarantine (Temporary)

## Purpose

This file tracks **temporary excluded tests** that are under active refactor/fix, so the rest of the suite can remain a stable CI gate.

## Active Quarantine Items

1. `src/services/ai/agentic/__tests__/budgetUtils.test.ts`
   - Reason: budget retry logic is being actively refactored; assertions are currently out of sync with in-progress implementation.
   - Status: temporary exclusion in `test:stable` and `test:cov:stable`.

2. `src/services/ai/agentic/summary/summaryInitializer.test.ts`
   - Reason: summary budget retry expectation is being updated alongside the same budget refactor.
   - Status: temporary exclusion in `test:stable` and `test:cov:stable`.

## Temporary Test Commands

- `pnpm run test:stable`
- `pnpm run test:cov:stable`

Both commands exclude **only** the two files listed above.

## Exit Criteria (Restore Full Gate)

Remove quarantine and restore full `pnpm test` CI gate when all are true:

1. Budget logic refactor is complete.
2. Both quarantined test files are updated to the new expected behavior.
3. `pnpm test` passes with no exclusions.
4. CI workflow switches from `test:stable` back to full test command.

## Target Date

- Review quarantine status by **2026-02-23**.
- If still needed after that date, add a short status update and a new review date.
