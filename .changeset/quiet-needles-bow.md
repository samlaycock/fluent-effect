---
"fluent-effect": patch
---

Fix `fx.withDependency` so direct dependency values of `undefined` are provided with `Effect.provideService` instead of being mistaken for the layer overload.
