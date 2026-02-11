# Directory Status Report

Generated at: 2026-02-11T13:54:08.235Z

## VFS Layout Summary

- Total VFS entries: 596
- Directories: 182
- Files: 414
- Expected but missing: 66

## VFS Directory Entries (Existing + Expected)

| Path | Exists | Expected | Readability | Permission Class | Writable | Allowed Write Ops | Update Triggers | Sources |
|---|---:|---:|---|---|---:|---|---|---|
| current/forks | no | yes | read_only | immutable_readonly | no | - | - | directory_scaffold, resource_template |
| current/forks/0 | no | yes | read_only | immutable_readonly | no | - | - | directory_scaffold, resource_template |
| current/forks/0/ops | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/conversation/history_rewrites | no | yes | read_write | elevated_editable | yes | write, history_rewrite, delete | history_rewrite, direct_write, elevated_write | resource_template |
| current | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | resource_template |
| current/forks/0/story | no | yes | read_only | immutable_readonly | no | - | - | directory_scaffold, resource_template |
| current/conversation | no | yes | finish_guarded | finish_guarded | no | finish_commit, history_rewrite | turn_commit, history_rewrite | resource_template |
| current/forks/0/story/summary | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/world | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold, resource_template |
| current/world/causal_chains | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/world/characters | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/world/factions | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/world/knowledge | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/world/locations | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/world/quests | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/world/timeline | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/shared | yes | yes | read_only | immutable_readonly | no | - | - | directory_scaffold, existing, resource_template |
| current/shared/config | no | yes | read_only | immutable_readonly | no | - | - | directory_scaffold, resource_template |
| current/custom_rules | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold, resource_template |
| current/custom_rules/00-system-core | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/01-world-setting | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/02-protagonist | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/03-npc-behavior | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/04-combat-action | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/05-writing-style | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/06-dialogue | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/07-mystery | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/08-state-management | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/09-hidden-truth | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/10-image-style | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/11-cultural | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/custom_rules/12-custom | no | yes | read_write | default_editable | yes | write, json_patch, json_merge, move, delete | direct_write | directory_scaffold |
| current/shared/config/runtime | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/shared/config/theme | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/shared/narrative | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/shared/narrative/conversation | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/outline | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/outline/phases | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/outline/story_outline | no | yes | read_only | immutable_readonly | no | - | - | resource_template |
| current/shared/system | yes | yes | read_only | immutable_readonly | no | - | - | existing, resource_template |
| current/refs | yes | yes | read_only | immutable_readonly | no | - | - | existing, resource_template |
| current/refs/atmosphere | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/refs/atmosphere/ambience | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/refs/atmosphere/envTheme | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/refs/atmosphere/weather | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills | yes | yes | read_only | immutable_readonly | no | - | - | existing, resource_template |
| current/skills/commands | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/cleanup | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/cleanup/references | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/compact | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/god | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/sudo | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/sudo/references | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/summary | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/commands/runtime/unlock | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/conditional | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/conditional/cultural | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/conditional/cultural/en | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/conditional/cultural/zh | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/conditional/nsfw | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core/essence | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core/identity | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core/philosophy | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core/protagonist-lens | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core/protagonist-lens/references | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/core/protocols | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/advanced-narrative | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/advanced-narrative/emotional-arc | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/advanced-narrative/indirect-expression | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/advanced-narrative/literary-adaptation | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/advanced-narrative/narrative-contrast | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/advanced-narrative/narrative-echo | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/atmosphere | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/causality | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/combat | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/conflicting-emotions | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/dialogue | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/mystery | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/reveals-foreshadowing | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/scene-beats | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/craft/writing | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/actor-design | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/actor-design/character | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/actor-design/dark-psychology | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/actor-design/item | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/actor-design/npc | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/actor-design/quest | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/antagonism | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/core-rules | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/fail-forward | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/humanity-hope | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/knowledge | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/moral-complexity | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/state-management | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/gm/temporal | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/npc | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/npc/logic | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/narrative-style | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/narrative-style/references | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/player-malice-intensity | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/player-malice-profile | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/player-malice-profile/references | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/world-disposition | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/presets/runtime/world-disposition/references | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/chinese-short-drama | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/court-intrigue | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/cyberpunk | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-academy | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-diplomacy | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-espionage | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-finance | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-law | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-maritime | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-media | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-medicine | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-urban | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/element-war | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/epic-worldbuilding | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/era-ancient | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/era-feudal | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/era-modern | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/era-republican | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/face-slapping-reversal | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/fantasy | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/healing-redemption | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/heist | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/horror | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/ip-faithful-adaptation | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/mystery | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/mystery-horror | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/noir | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/post-apocalypse | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/romance | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/slice-of-life | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/style-scifi | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/style-supernatural | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/suspense-thriller | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/trade-mercantilism | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/tragic-angst | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/theme/wuxia | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/actors-territory | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/actors-territory/factions | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/actors-territory/locations | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/economy-logistics | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/economy-logistics/economy | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/economy-logistics/finance-banking | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/economy-logistics/maritime-logistics | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/economy-logistics/travel | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/economy-logistics/war-logistics | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/class-status | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/crime-underworld | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/diplomacy-treaties | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/espionage-counterintel | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/governance-politics | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/institutions | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/law-jurisdiction | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/media-propaganda | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/governance-society/religion | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture/culture-ritual | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture/deep-foundations | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture/deep-foundations/culture-system | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture/deep-foundations/history-system | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture/deep-foundations/law-system | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/history-culture/history-residue | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/disasters-recovery | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/ecology | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/infrastructure | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/knowledge-education | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/magic-system | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/medicine-forensics | yes | no | read_only | immutable_readonly | no | - | - | existing |
| current/skills/worldbuilding/systems/technology | yes | no | read_only | immutable_readonly | no | - | - | existing |

## VFS Expected But Missing Paths

| Kind | Path | Readability | Permission Class | Scope | Domain | Template |
|---|---|---|---|---|---|---|
| dir | current/forks | read_only | immutable_readonly | fork | runtime | template.fallback.fork |
| dir | current/forks/0 | read_only | immutable_readonly | fork | runtime | template.fallback.fork |
| dir | current/forks/0/ops | read_only | immutable_readonly | fork | runtime | template.fallback.fork |
| dir | current/conversation/history_rewrites | read_write | elevated_editable | fork | ops | template.ops.history_rewrites |
| dir | current | read_write | default_editable | fork | runtime | template.runtime.fork |
| dir | current/forks/0/story | read_only | immutable_readonly | fork | runtime | template.fallback.fork |
| dir | current/conversation | finish_guarded | finish_guarded | fork | story | template.story.conversation |
| dir | current/forks/0/story/summary | read_only | immutable_readonly | fork | runtime | template.fallback.fork |
| file | current/summary/state.json | finish_guarded | finish_guarded | fork | story | template.story.summary |
| dir | current/world | read_write | default_editable | fork | story | template.story.world |
| dir | current/world/causal_chains | read_write | default_editable | fork | story | template.story.world |
| file | current/world/causal_chains/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/world/characters | read_write | default_editable | fork | story | template.story.world |
| file | current/world/characters/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/world/factions | read_write | default_editable | fork | story | template.story.world |
| file | current/world/factions/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/world/knowledge | read_write | default_editable | fork | story | template.story.world |
| file | current/world/knowledge/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/world/locations | read_write | default_editable | fork | story | template.story.world |
| file | current/world/locations/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/world/quests | read_write | default_editable | fork | story | template.story.world |
| file | current/world/quests/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/world/timeline | read_write | default_editable | fork | story | template.story.world |
| file | current/world/timeline/README.md | read_write | default_editable | fork | story | template.story.readme_lock |
| dir | current/shared/config | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| dir | current/custom_rules | read_write | default_editable | shared | config | template.config.custom_rules |
| dir | current/custom_rules/00-system-core | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/00-system-core/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/01-world-setting | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/01-world-setting/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/02-protagonist | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/02-protagonist/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/03-npc-behavior | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/03-npc-behavior/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/04-combat-action | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/04-combat-action/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/05-writing-style | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/05-writing-style/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/06-dialogue | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/06-dialogue/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/07-mystery | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/07-mystery/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/08-state-management | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/08-state-management/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/09-hidden-truth | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/09-hidden-truth/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/10-image-style | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/10-image-style/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/11-cultural | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/11-cultural/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/custom_rules/12-custom | read_write | default_editable | shared | config | template.config.custom_rules |
| file | current/custom_rules/12-custom/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| file | current/custom_rules/README.md | read_write | default_editable | shared | config | template.config.readme_lock |
| dir | current/shared/config/runtime | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| file | current/world/runtime/custom_rules_ack_state.json | read_write | default_editable | shared | config | template.config.custom_rules_ack |
| dir | current/shared/config/theme | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| file | current/world/theme_config.json | read_write | default_editable | shared | config | template.config.theme |
| dir | current/shared/narrative | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| dir | current/shared/narrative/conversation | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| file | current/conversation/fork_tree.json | finish_guarded | finish_guarded | shared | narrative | template.narrative.conversation.fork_tree |
| file | current/conversation/index.json | finish_guarded | finish_guarded | shared | narrative | template.narrative.conversation.index |
| dir | current/outline | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| file | current/outline/outline.json | read_write | elevated_editable | shared | narrative | template.narrative.outline.main |
| dir | current/outline/phases | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
| file | current/outline/progress.json | read_write | default_editable | shared | narrative | template.narrative.outline.progress |
| dir | current/outline/story_outline | read_only | immutable_readonly | shared | runtime | template.fallback.shared |
