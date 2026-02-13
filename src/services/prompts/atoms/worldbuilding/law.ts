/**
 * ============================================================================
 * Worldbuilding Atom: Law & Justice Systems
 * ============================================================================
 *
 * 法律不是正义的化身——它是权力者用墨水铸造的锁链。
 * 涵盖：法律类型、执法层级、腐败模式、避难与管辖。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

/**
 * Law Systems - 完整版
 */
export const lawSystem: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/law#lawSystem",
    source: "atoms/worldbuilding/law.ts",
    exportName: "lawSystem",
  },
  () => `
<worldbuilding_context>
**LAW & JUSTICE SYSTEM DESIGN:**

Law is what the powerful write to protect what they have. Justice is the story they tell about it.
The question isn't "Is it legal?" but "Who holds the pen that writes the law, and whose blood is the ink?"

<legal_systems>
**LEGAL SYSTEM TYPES:**

**FORMAL LAW** (Written, codified, professional — the architecture of controlled violence):
- Courts, judges, advocates
- Precedent and procedure
- Slow, expensive, predictable — which is to say, it favors those who can afford to wait
- The rich man's shield, the poor man's cage

**CUSTOMARY LAW** (Traditional, oral, communal):
- Elders, village councils
- "This is how we've always done it"
- Flexible, local, personal
- Outsiders don't know the rules

**RELIGIOUS LAW** (Divine authority, clerical courts):
- Sin and redemption
- Confession and penance
- Excommunication as punishment
- Conflicts with secular authority

**MARTIAL LAW** (Military authority, emergency powers):
- Commander's word is law
- Summary judgment
- "Necessary for security"
- Temporary (in theory)

**NO LAW** (Power is law — the oldest system, never truly extinct):
- Whoever can enforce their will
- Feuds and blood prices — the arithmetic of vengeance
- Protection through alliance
- Constant negotiation — every conversation is a treaty

**OVERLAPPING JURISDICTIONS:**
- Church crime vs secular crime
- Guild law vs city law
- Noble privilege vs common law
- International matters
</legal_systems>

<enforcement_tiers>
**ENFORCEMENT TIERS:**

| Level | Force | Scope | Corruption |
|-------|-------|-------|------------|
| **CITY WATCH** | 20-200 armed | City streets | High (underpaid) |
| **LORD'S MEN** | 50-500 soldiers | Domain | Medium (loyal) |
| **TEMPLE GUARDS** | 10-50 zealots | Holy ground | Low (fanatical) |
| **GUILD ENFORCERS** | 5-20 specialists | Trade matters | Depends on guild |
| **ROYAL INQUISITORS** | 3-10 elite | Kingdom-wide | Varies (feared) |
| **MOB JUSTICE** | Variable | Immediate | None (passion) |

**ENFORCEMENT QUESTIONS:**
- Who investigates crimes?
- Who arrests suspects?
- Who holds trials?
- Who carries out punishment?
- (Often different people with competing interests)

**ENFORCEMENT LIMITS:**
- Budget: Not enough guards for everywhere
- Territory: Authority ends at borders
- Skill: Complex crimes need expertise
- Politics: Some people are untouchable
</enforcement_tiers>

<corruption_patterns>
**CORRUPTION PATTERNS:**

**BRIBERY:**
| Level | Cost | Gets You |
|-------|------|----------|
| **Minor** | Few coins | Looked the other way |
| **Standard** | Week's wages | Delayed investigation |
| **Major** | Month's income | Case dismissed |
| **Exceptional** | Fortune | Never happened |

**INFLUENCE:**
- "The Duke's nephew did nothing wrong"
- "The guild has spoken to the judge"
- "The Temple vouches for him"
- "You don't want to make enemies"

**SELECTIVE ENFORCEMENT:**
- Laws applied to enemies, ignored for friends — the sword cuts only downward
- Poor punished, rich fined (if at all)
- Outsiders suspect, locals given benefit
- Enforce the letter to harm, ignore spirit to help

**SYSTEMIC CORRUPTION:**
- Purchased positions (judge bought the seat)
- Inherited connections (father was a judge)
- Institutional blindness (we don't prosecute our own)
- Competing loyalties (guild member first, citizen second)

**INCORRUPTIBLE (RARE — like drought-resistant crops, they exist because they must):**
- True believers in justice — dangerous precisely because they cannot be reasoned with
- Those with nothing to lose
- Those who've lost everything to corruption — the wounded who became the blade
- Those being watched by someone incorruptible
</corruption_patterns>

<sanctuary_jurisdiction>
**SANCTUARY & JURISDICTION:**

**SANCTUARY TYPES:**
| Place | Protection | Limits |
|-------|------------|--------|
| **TEMPLE** | Divine protection | Until priest surrenders you |
| **EMBASSY** | Foreign soil | While ambassador allows |
| **GUILD HALL** | Guild authority | For members only |
| **NOBLE ESTATE** | Lord's protection | At lord's pleasure |
| **NEUTRAL GROUND** | Treaty protects | While treaty holds |

**JURISDICTION CONFLICTS:**
- Crime in one territory, criminal in another
- Victim from one class, criminal from another
- Church sin vs state crime
- Guild matter vs city matter

**EXTRADITION:**
- "Send them back for trial"
- "We'll try them ourselves"
- "They're under our protection"
- "What criminal? We don't see anyone."

**GRAY ZONES:**
- International waters
- Disputed borders
- Lawless regions
- Where law hasn't caught up to reality
</sanctuary_jurisdiction>

<punishment_spectrum>
**PUNISHMENT SPECTRUM:**

| Severity | Punishment | Used For |
|----------|------------|----------|
| **MINIMAL** | Warning, fine | Minor infractions |
| **LIGHT** | Public shame, stocks | Public offenses |
| **MODERATE** | Imprisonment, labor | Serious crimes |
| **SEVERE** | Flogging, branding | Violence, repeat offenses |
| **EXTREME** | Maiming, blinding | Theft, assault |
| **CAPITAL** | Execution | Murder, treason, heresy |

**EXECUTION METHODS:**
- Hanging (common criminals)
- Beheading (nobles, soldiers)
- Burning (heretics, witches)
- Drowning (pirates, oath-breakers)
- Drawing and quartering (traitors)

**ALTERNATIVE PUNISHMENTS:**
- Exile (never return)
- Outlawry (anyone may kill you)
- Service (military, labor, church)
- Weregild (blood money to victim's family)
- Trial by ordeal (let the gods decide)
</punishment_spectrum>

<legal_leverage>
**LEGAL LEVERAGE:**

**USING LAW AS WEAPON:**
- False accusations to harass — the accusation itself is the punishment
- Legal costs to bankrupt — justice by attrition
- Delays to outlast opponent — the law's patience is infinite, yours is not
- Technicalities to trap — the fine print is where they bury the knife

**DEFENDING AGAINST LAW:**
- Witnesses (bought, persuaded, intimidated)
- Evidence (found, fabricated, destroyed)
- Jurisdiction (not your court)
- Immunity (diplomatic, religious, noble)

**LEGAL THREATS:**
- "If this goes to trial..."
- "I know people in the courts..."
- "Your business license could be revoked..."
- "The Church takes a dim view of..."

**OPERATING OUTSIDE LAW:**
- Criminals know which laws aren't enforced
- Everyone knows what bribes work
- Some things are illegal but tolerated
- Some things are legal but socially forbidden
</legal_leverage>

<player_interaction>
**PLAYER INTERACTION WITH LAW:**

**CONSEQUENCES OF CRIME:**
| Action | Likely Response |
|--------|-----------------|
| **Petty theft** | Fine or stocks if caught |
| **Assault** | Arrest, trial, imprisonment |
| **Murder** | Manhunt, serious trial, execution |
| **Treason** | Kill on sight or show trial |

**GETTING AWAY WITH IT:**
- No witnesses
- Witnesses silenced
- Bribed officials
- Powerful patron
- Fled jurisdiction
- Someone else blamed

**BEING FALSELY ACCUSED:**
- Who's behind it?
- What do they want?
- How to prove innocence?
- What if you can't?

**LAW AS OBSTACLE:**
- Need something in a restricted area
- Need to do something illegal for good reasons
- Legal consequences would derail goals
- Must work within or around the system
</player_interaction>
</worldbuilding_context>
`,
);

/**
 * Law Systems - 精简版
 */
export const lawSystemLite: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/law#lawSystemLite",
    source: "atoms/worldbuilding/law.ts",
    exportName: "lawSystemLite",
  },
  () => `
<worldbuilding_context>
**LAW & JUSTICE**: Law is what the powerful write to protect what they have.
- Legal systems (formal, customary, religious, martial)
- Enforcement tiers (watch, lord's men, temple guards, mob)
- Corruption patterns (bribery, influence, selective enforcement)
- Sanctuary & jurisdiction (temple, embassy, guild hall)
- Punishment spectrum (warning → execution)
- Legal leverage (using law as weapon, defending against law)
</worldbuilding_context>
`,
);

export default lawSystem;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const lawSystemSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/law#lawSystemSkill",
    source: "atoms/worldbuilding/law.ts",
    exportName: "lawSystemSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(lawSystem),

    quickStart: `
1. Law is a tool, not justice (who decides what's legal?)
2. Multiple jurisdictions overlap (church, guild, city, lord)
3. Enforcement is limited (budget, territory, politics)
4. Corruption is normal (bribery, influence, selective enforcement)
5. Sanctuary exists (temple, embassy, guild hall—each with limits)
6. Punishment scales (warning → stocks → prison → maiming → death)
`.trim(),

    checklist: [
      "Legal system type defined (formal, customary, religious)?",
      "Enforcement bodies established (who arrests, who judges)?",
      "Corruption patterns present (bribery scale, influence)?",
      "Jurisdictional conflicts exist (church vs state, guild vs city)?",
      "Sanctuary options available (where can people flee)?",
      "Punishment spectrum appropriate to setting?",
      "Legal leverage usable by players and NPCs?",
      "Gray zones exist (where law is weak or absent)?",
    ],

    examples: [
      {
        scenario: "Corruption as Normal",
        wrong: `"The law is fair and just."
(Idealistic, no gameplay hooks.)`,
        right: `"Justice costs money. A copper gets the guard to look away.
A silver gets the case delayed. A gold gets it dismissed.
Everyone knows the rates. It's not corruption—it's the system."
(Specific costs, normalized, creates choices.)`,
      },
      {
        scenario: "Jurisdictional Conflict",
        wrong: `"He was arrested and tried."
(Simple, no complexity.)`,
        right: `"The Temple claims him—sin against the gods. The Guild claims him—
violated trade law. The Watch claims him—murder on city streets.
Three courts. Three verdicts. Three punishments. Which one gets him?"
(Competing authorities, political tension.)`,
      },
      {
        scenario: "Sanctuary",
        wrong: `"He fled to the church."
(No rules, no tension.)`,
        right: `"Temple sanctuary lasts until the next holy day—seven days.
Then the priests must decide: shelter the fugitive and anger the Duke,
or surrender him and anger the gods. They're not sure which is worse."
(Time limit, difficult choice, political stakes.)`,
      },
      {
        scenario: "Selective Enforcement",
        wrong: `"The law applies equally to everyone."
(Naive, no drama.)`,
        right: `"The Duke's son killed a merchant. Self-defense, they say.
The merchant's brother killed a Duke's servant. Murder, they say.
Same act. Different outcome. The law is blind—to who has power."
(Hypocrisy creates resentment and story hooks.)`,
      },
    ],
  }),
);
