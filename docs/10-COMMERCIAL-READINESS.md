<!--
File: docs/10-COMMERCIAL-READINESS.md
Purpose: Separates working v1.0 engineering scope from controls still needed for paid external production distribution.
Author: Raushan Raj
-->

# Commercial Readiness

Qualyntra v1.0.0 is a **high-quality private product engineering baseline**, not a claim that a paid multi-tenant SaaS has completed security/compliance/legal certification.

Before accepting enterprise production workloads, complete:

- Independent security review and threat model.
- Dependency/SBOM and license policy.
- Authentication/authorization and tenant boundaries.
- Persistence, migrations, backup/restore and disaster recovery.
- SLA/SLO monitoring, support model and upgrade policy.
- Secrets/KMS/BYOK and private-network deployment validation.
- Data residency/retention/deletion controls.
- Adapter certification matrices with real vendor runtimes.
- Performance/load/soak testing.
- Accessibility/UI review once dashboard UI is implemented.
- Trademark/domain/product-name clearance.
- Commercial license, privacy terms and support terms.

Keeping these explicit prevents product documentation from overstating maturity.

