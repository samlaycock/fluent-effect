---
"fluent-effect": patch
---

Isolate package export smoke tests from the repository `dist` directory so concurrent typecheck runs cannot observe a partially rebuilt package output.
