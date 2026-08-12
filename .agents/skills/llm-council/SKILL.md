---
name: llm-council
description: LLM Council workflow (inspired by Andrej Karpathy's llm-council). Use when solving complex architectural problems, evaluating difficult trade-offs, running multi-perspective code reviews, or synthesising consensus from multiple AI models/roles.
---

# LLM Council Skill

This skill implements the **LLM Council** multi-stage reasoning methodology created by Andrej Karpathy ([karpathy/llm-council](https://github.com/karpathy/llm-council)).

## Core Methodology

When faced with complex, non-trivial engineering questions, critical refactoring decisions, or ambiguous architecture choices, run the 3-stage Council process:

### Stage 1: Independent First Opinions (Divergence)
- Deconstruct the problem into core components.
- Generate 3 to 4 distinct, independent perspectives (e.g. Senior Architect, Security Lead, Performance Specialist, Pragmatic Product Engineer).
- Collect the proposed solutions and trade-off analyses without cross-model influence.

### Stage 2: Blind Peer Review & Ranking (Evaluation)
- Anonymize each perspective's proposal (`Proposal A`, `Proposal B`, `Proposal C`).
- Evaluate each proposal against:
  - **Correctness & Robustness**: Edge cases, failure modes, data consistency.
  - **Maintainability**: Complexity overhead, readability, future-proofing.
  - **Performance & Scalability**: Latency, memory, network calls.
  - **Security**: Vulnerabilities, authentication/authorization boundaries.
- Rank the proposals and identify the strongest elements and flaws in each.

### Stage 3: Chairman Synthesis (Consensus & Final Strategy)
- Synthesize all peer reviews and rankings.
- Extract the best ideas from each perspective.
- Formulate a single, definitive, authoritative implementation plan or recommendation for the user.

## When to Trigger
- Complex refactoring or architecture design decisions.
- Security-sensitive logic or data modeling.
- Performance bottlenecks requiring multi-dimensional optimization.
- Any time the user explicitly mentions "council", "llm-council", or asks for a multi-model consensus review.
