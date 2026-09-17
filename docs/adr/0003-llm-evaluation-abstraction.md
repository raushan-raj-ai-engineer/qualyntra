<!--
File: docs/adr/0003-llm-evaluation-abstraction.md
Purpose: Records the decision to own the evaluation contract while integrating external frameworks such as DeepEval through adapters.
Author: Raushan Raj
-->

# ADR 0003 — LLM Evaluation Abstraction

**Decision:** Qualyntra owns the normalized model/evaluation contracts. DeepEval and model vendors are adapters.

**Reason:** Enterprises need multi-provider/custom-model support and cannot be forced into a single evaluation framework.

