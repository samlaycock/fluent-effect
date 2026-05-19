---
"fluent-effect": patch
---

Reject `fx.retry` options that provide `factor` without `backoff`, preventing factor-only retry policies from silently retrying zero times.
