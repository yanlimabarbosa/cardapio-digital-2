# Shared Backend Infrastructure

This directory holds backend-only shared domain, application, and infrastructure building blocks.

- `domain` is for deliberately shared backend business rules that are used by more than one bounded context, such as pricing and loyalty-points policies.
- `application` is for cross-context application abstractions such as clocks and unit-of-work contracts.
- `infrastructure` is for concrete backend infrastructure implementations such as MikroORM transaction adapters.

Do not use this directory as a generic bucket for business rules. Domain behavior should live in the owning context unless multiple backend contexts depend on the same invariant. Frontend-safe shared behavior still belongs in `packages/shared`.
