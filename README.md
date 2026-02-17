<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo_dark_symbol.png">
  <source media="(prefers-color-scheme: light)" srcset="public/logo_light_symbol.png">
  <img alt="Chronicles of Infinity Logo" src="public/logo_dark_symbol.png" width="168" />
</picture>

# Chronicles of Infinity

**A governance-grade AI narrative RPG platform.**

**Built for campaign-scale causality, inspectability, and genre discipline.**

[English](README.md) | [中文](README_CN.md)

</div>

<a id="document-metadata"></a>

## Document Metadata

- **Status**: Active
- **Edition**: 2026 Q1
- **Audience**: Product, Narrative Design, Engineering
- **Scope**: Platform-level overview, methodological model, and trust posture
- **Out of Scope**: Full implementation specification for every runtime module
- **Primary Promise**: Coherent, traceable, long-form interactive storytelling

<a id="table-of-contents"></a>

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Reader Paths](#reader-paths)
3. [Why It Feels Different](#why-it-feels-different)
4. [Scope and Non-Goals](#scope-and-non-goals)
5. [Design Objectives](#design-objectives)
6. [Architecture Principles at a Glance](#architecture-principles-at-a-glance)
7. [Methodological Framework](#methodological-framework)
8. [Distinctive Capabilities](#distinctive-capabilities)
9. [Governance and Trust Framework](#governance-and-trust-framework)
10. [Reliability and Trust Model](#reliability-and-trust-model)
11. [Operational Evaluation Criteria](#operational-evaluation-criteria)
12. [Core Narrative Domains](#core-narrative-domains)
13. [One-Session Experience Loop](#one-session-experience-loop)
14. [Evidence Map](#evidence-map)
15. [For Creators and Extenders](#for-creators-and-extenders)
16. [Glossary](#glossary)
17. [Quick Start](#quick-start)
18. [Deployment and Documentation](#deployment-and-documentation)
19. [License](#license)

<a id="executive-summary"></a>

## Executive Summary

Chronicles of Infinity is a narrative-first AI adventure platform designed for campaign-length interactive fiction.

Its core thesis is straightforward: long-form narrative quality is a systems discipline. If state is not durable, perspective is not controlled, and continuity is not managed under context pressure, story quality eventually collapses.

This repository addresses that challenge through canonical state management (VFS), actor-first reasoning, dual-layer truth modeling (Visible/Hidden), and explicit theme governance.

<a id="reader-paths"></a>

## Reader Paths

- If you need architecture intent and trust posture: read `Design Objectives`, `Architecture Principles at a Glance`, and `Governance and Trust Framework`.
- If you need product differentiation: read `Why It Feels Different`, `Distinctive Capabilities`, and `Core Narrative Domains`.
- If you need implementation evidence: read `Evidence Map`.
- If you need immediate setup: read `Quick Start` and `Deployment and Documentation`.

<a id="why-it-feels-different"></a>

## Why It Feels Different

| Product Pillar                     | System Commitment                                                       | Player-Facing Effect                                          |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| World keeps a ledger               | Canonical VFS state is the source of truth                              | Choices leave durable traces and can be revisited later       |
| Surface story + hidden progression | Visible and Hidden layers evolve in parallel                            | The world can surprise the player without breaking logic      |
| Long-horizon continuity controls   | Compact + Query Summary fallback + Cleanup workflows                    | Multi-session campaigns stay coherent instead of drifting     |
| Genre as behavioral contract       | Theme governance constrains tone, pacing, risk, and consequence grammar | Different themes behave differently, not just sound different |

<a id="scope-and-non-goals"></a>

## Scope and Non-Goals

### In Scope

- Campaign-length interactive storytelling with persistent causality.
- Role-based narrative perspective and controlled information disclosure.
- Theme-governed generation behavior across long sessions.
- Inspectable runtime surfaces for creators and maintainers.

### Non-Goals

- One-turn spectacle generation optimized only for novelty.
- Purely cosmetic genre switching without behavioral impact.
- Hidden, non-auditable state mutation pipelines.
- Replacing human-authored novels with fully deterministic scripted output.

<a id="design-objectives"></a>

## Design Objectives

- **Continuity over isolated brilliance**: prioritize stable multi-turn coherence over one-turn stylistic spikes.
- **Causal traceability**: ensure major narrative outcomes are grounded in stored state transitions.
- **Perspective fidelity**: separate what the player can know from what the world currently contains.
- **Genre integrity**: preserve theme-specific pacing and consequence logic throughout long sessions.
- **Operational transparency**: expose runtime structures so creators can inspect, debug, and extend behavior.

<a id="architecture-principles-at-a-glance"></a>

## Architecture Principles at a Glance

| Principle                   | Primary Mechanism                            | Operational Result                                     |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Canonical state first       | VFS-backed world and campaign files          | Story facts remain inspectable and durable             |
| Perspective before prose    | Actor-first reasoning model                  | Responses follow role position and information limits  |
| Dual-layer truth            | Visible/Hidden narrative layers              | Discovery and revelation remain structurally valid     |
| Continuity under pressure   | Compact + Query Summary fallback + Cleanup   | Long sessions degrade gracefully instead of collapsing |
| Genre as contract           | Theme governance constraints                 | Tone and consequence grammar remain consistent         |
| Branch-aware memory         | Fork-sensitive historical records            | Divergent lines preserve local causality               |
| Trust through observability | Schema contracts + file-based state surfaces | Runtime behavior can be audited and evolved            |

<a id="methodological-framework"></a>

## Methodological Framework

- **Canonical State Substrate (VFS)**
  World and campaign data are managed as canonical files. State is never treated as disposable prompt residue.

- **Actor-First Reasoning**
  The runtime evaluates events from actor position, social context, and information access, which reduces omniscient flattening.

- **Visible/Hidden Dual-Layer Truth**
  Player-facing reality and world-internal reality are modeled separately. Revelation is produced by progression, not retroactive rewriting.

- **Continuity Preservation Stack**
  Compact, Query Summary fallback, and Cleanup workflows are coordinated to preserve coherence under long-context pressure.

- **Genre Governance Contracts**
  Themes define narrative constraints across tone, tempo, conflict grammar, and consequence shape.

- **Branch-Aware Historical Memory**
  Divergent lines evolve independently while preserving local causality and recoverable history.

<a id="distinctive-capabilities"></a>

## Distinctive Capabilities

- **Structured world entities**
  Actors, factions, locations, quests, knowledge, timelines, and causal chains are managed as connected state objects.

- **Systemic consequence propagation**
  Outcomes are computed from persisted world conditions rather than surface-level callbacks.

- **Perspective-controlled disclosure**
  Information appearance depends on role visibility and unlock status, preserving discovery dynamics.

- **Campaign-level drift control**
  Continuity stabilization is a runtime operation, not an ad-hoc editorial patch.

- **Theme persistence at scale**
  Genre identity remains stable over long sessions instead of converging into generic prose.

- **Creator-operable runtime surface**
  Through VFS tooling and schema contracts, advanced users can inspect and evolve narrative behavior.

<a id="governance-and-trust-framework"></a>

## Governance and Trust Framework

| Layer              | Core Question                                       | Control Mechanisms                                                        | Platform Outcome                                           |
| ------------------ | --------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Design governance  | How are narrative rules defined and constrained?    | Theme authoring protocol, schema contracts, documented extension workflow | Themes operate as contracts, not decoration                |
| Runtime governance | How is coherence preserved while the campaign runs? | Actor-first reasoning, dual-layer truth, continuity stack                 | Story evolution remains causally and perspectivally stable |
| Audit governance   | How can teams verify behavior after the fact?       | VFS state surfaces, branch-aware history, tooling docs                    | Decisions and outcomes remain inspectable and explainable  |

<a id="reliability-and-trust-model"></a>

## Reliability and Trust Model

| Trust Claim            | Operational Anchor                         | Verification Surface                                        |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| State traceability     | Persistent VFS world and campaign files    | State artifacts, history snapshots, and world records       |
| Causal consistency     | Actor memory + stored world facts          | Outcome justification against recorded transitions          |
| Layer integrity        | Visible/Hidden separation and reveal logic | Consistency between hidden progression and later revelation |
| Controlled degradation | Summary fallback and Cleanup workflows     | Coherence recovery behavior under context pressure          |
| Governed extensibility | Theme protocols + schema + docs            | Safe extension without breaking platform contracts          |

<a id="operational-evaluation-criteria"></a>

## Operational Evaluation Criteria

Use this gate before major release or narrative policy changes:

| Evaluation Gate  | Key Question                                                                                | Passing Signal                                               |
| ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Continuity gate  | Can current state be explained by prior turns without contradiction?                        | No unresolved continuity breaks in sampled campaigns         |
| Causality gate   | Are major outcomes justified by persisted world facts?                                      | Outcome paths match recorded state transitions               |
| Perspective gate | Does player-facing knowledge stay inside role visibility boundaries?                        | No unauthorized information leakage in validation runs       |
| Theme gate       | Does pacing and consequence grammar remain genre-consistent over long sessions?             | Theme-specific behavior remains stable across branches       |
| Recovery gate    | Under context stress, can fallback workflows restore coherence without flattening identity? | Post-recovery narrative keeps both logic and genre character |

<a id="core-narrative-domains"></a>

## Core Narrative Domains

| Domain                 | Narrative Pressure Model                                     | Representative Lanes                                                        |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Power-Reversal Fantasy | Status asymmetry, public conflict, reversal economics        | Long Aotian power fantasies, War God Returns, urban hierarchy reversal      |
| Tragedy and Regret     | Delayed truth, emotional debt, irreversible outcomes         | Wife-chasing crematorium arcs, substitute first-love tragedy, regret routes |
| Healing and Growth     | Relational repair through constrained repeated choices       | Sweet-healing romance, mutual redemption, everyday growth campaigns         |
| Mystery and Horror     | Information asymmetry, rule pressure, epistemic risk         | Classical deduction, rule-horror loops, cosmic dread                        |
| Epic Worldbuilding     | Individual agency under factional and civilizational systems | Western fantasy epics, cultivation sagas, cyber-scale civilization conflict |

<a id="one-session-experience-loop"></a>

## One-Session Experience Loop

1. **Choose a narrative domain**
   Select a theme class and its pressure model.
2. **Instantiate protagonist position**
   Set leverage, constraints, and social exposure.
3. **Make scene decisions**
   Act through contextual options or custom intent.
4. **Receive system response**
   World entities and hidden processes update from canonical state.
5. **Absorb consequences**
   Immediate and delayed effects are both persisted.
6. **Carry continuity forward**
   Branch history, theme discipline, and causal legibility remain intact for the next session.

<a id="evidence-map"></a>

## Evidence Map

- **Architecture and policy**:
  [`docs/vfs-v2-architecture.md`](docs/vfs-v2-architecture.md),
  [`docs/VFS_TOOLING.md`](docs/VFS_TOOLING.md)
- **Schema contracts**:
  [`docs/SCHEMA_DOCS.md`](docs/SCHEMA_DOCS.md)
- **Prompt and skills runtime**:
  [`src/services/prompts/README.md`](src/services/prompts/README.md)
- **Theme extension protocol**:
  [`docs/how_to_add_story_theme.md`](docs/how_to_add_story_theme.md)
- **Theme mapping and rewrite methodology**:
  [`docs/plans/THEME_MAPPING_TABLE.md`](docs/plans/THEME_MAPPING_TABLE.md),
  [`docs/plans/THEME_REWRITE_TASK.md`](docs/plans/THEME_REWRITE_TASK.md)
- **Worldbuilding and protagonist methodology**:
  [`docs/plans/WORLDBUILDING_METHODOLOGY.md`](docs/plans/WORLDBUILDING_METHODOLOGY.md),
  [`docs/plans/PROTAGONIST_ECOLOGY.md`](docs/plans/PROTAGONIST_ECOLOGY.md)
- **Narrative UI standards**:
  [`docs/ui_vn_style.md`](docs/ui_vn_style.md)

<a id="for-creators-and-extenders"></a>

## For Creators and Extenders

Recommended order for extension and governance work:

1. Define the domain contract with theme and world assumptions.
2. Encode constraints through prompt modules and skills.
3. Validate behavior with continuity, causality, and perspective gates.
4. Publish extension decisions with schema and documentation alignment.

Primary references:

- [`docs/how_to_add_story_theme.md`](docs/how_to_add_story_theme.md)
- [`src/services/prompts/README.md`](src/services/prompts/README.md)
- [`docs/VFS_TOOLING.md`](docs/VFS_TOOLING.md)
- [`docs/vfs-v2-architecture.md`](docs/vfs-v2-architecture.md)
- [`docs/SCHEMA_DOCS.md`](docs/SCHEMA_DOCS.md)

<a id="glossary"></a>

## Glossary

- **Canonical State**: persistent source of truth used for narrative computation.
- **Actor-First**: decision logic grounded in role position and information access.
- **Visible Layer**: player-facing narrative facts currently disclosed in play.
- **Hidden Layer**: world-internal truths not yet disclosed to the player.
- **Continuity Stack**: Compact, Query Summary fallback, and Cleanup workflows.
- **Theme Governance**: constraints that enforce genre-specific narrative behavior.
- **Branch History**: fork-aware historical records for divergent narrative lines.
- **Causal Legibility**: ability to explain outcomes through inspectable prior state.

<a id="quick-start"></a>

## Quick Start

1. Install dependencies.
   ```bash
   pnpm install
   ```
2. Create `.env.local` in the project root and configure one provider key.
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   # or
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
3. Start the app.
   ```bash
   pnpm dev
   ```
4. Open `http://localhost:5173`.

If you prefer npm, use `npm install` and `npm run dev`.

<a id="deployment-and-documentation"></a>

## Deployment and Documentation

- Build command: `pnpm build`
- Supported deployment targets: GitHub Pages, Cloudflare Pages
- Documentation hub:
  [`docs/how_to_add_story_theme.md`](docs/how_to_add_story_theme.md),
  [`docs/VFS_TOOLING.md`](docs/VFS_TOOLING.md),
  [`docs/vfs-v2-architecture.md`](docs/vfs-v2-architecture.md),
  [`docs/SCHEMA_DOCS.md`](docs/SCHEMA_DOCS.md),
  [`docs/ui_vn_style.md`](docs/ui_vn_style.md)

<a id="license"></a>

## License

Source code in this repository is licensed under
[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/).

Commercial use in any form is prohibited.
See `LICENSE` for full terms.
