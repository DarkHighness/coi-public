# Test Helper Guidelines

This folder contains shared helpers for test assertions that should stay stable while minimizing noisy diffs.

## `schemaHint.ts`

Use `pickHintSignatureLines` when validating schema-hint text where full snapshots are too fragile.

### Prefer signature-line assertions when

- the output contains long enum unions or large nested schema text
- the test only needs to protect key contract fields/order
- unrelated schema growth would create high snapshot churn

### Prefer full snapshot assertions when

- the output is short and deterministic
- exact formatting is part of the contract
- any output drift should fail loudly

### Recommended pattern

1. assert broad invariants first (e.g., field is present/absent)
2. extract signature lines with `pickHintSignatureLines`
3. snapshot only those signature lines
