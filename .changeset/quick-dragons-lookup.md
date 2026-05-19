---
"fluent-effect": patch
---

Reduce allocations in `fx.getDependencies` by building dependency lookup results in a single pass.
