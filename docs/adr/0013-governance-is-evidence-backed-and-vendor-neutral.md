<!--
File: docs/adr/0013-governance-is-evidence-backed-and-vendor-neutral.md
Purpose: Records the decision to keep governance evidence-backed, deny-by-default, tenant-scoped, and separate from vendor integrations.
Author: Raushan Raj
-->
# ADR 0013: Governance is evidence-backed and vendor-neutral

## Decision
Governance contracts live in protected platform packages. Vendor systems integrate only through `IntegrationAdapter`. Authorization is deny-by-default and scoped hierarchically. Release decisions expose individual rule outcomes, evidence references, exceptions, and approvals instead of producing an unexplained score.

## Consequences
- SSO providers, work trackers, source-control systems, CI tools, vaults, and durable audit stores can be replaced without changing the governance kernel.
- Missing blocking evidence fails closed.
- Exceptions expire and are limited to an explicit tenant scope.
- Commercial deployments can add durable/WORM audit persistence behind the same audit contract.
