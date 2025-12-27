/**
 * ============================================================================
 * Image Atom: IP Fidelity Requirements
 * ============================================================================
 *
 * IP 忠实度要求 - 确保图片生成尊重已有 IP 的视觉风格。
 */

import type { Atom } from "../types";

/**
 * IP 忠实度要求
 */
export const ipFidelityRequirements: Atom<
  void
> = () => `<ip_fidelity_requirements>
  If this story is based on an established intellectual property (IP), game, novel, film, or other known work:
  You MUST adhere to the original IP's visual identity:
  - **Art Style**: Match the visual style of original illustrations, concept art, or film/game adaptations
  - **Composition**: Use framing and shot composition consistent with the source material's cinematography or illustration style
  - **Color Palette**: Replicate the characteristic color schemes and grading of the original work
  - **Iconic Elements**: Include signature visual motifs, symbols, or design elements from the IP (e.g., lightsabers for Star Wars, One Ring for LOTR, etc.)
  - **Character Design**: Maintain consistency with established character appearances and costume designs from the source material
  - **World Design**: Architecture, environments, and props must match the IP's established aesthetic and lore
  - **Tone**: Capture the visual mood and atmosphere that defines the original property
  - **References**: Draw from official artwork, film stills, game screenshots, or published illustrations
  DO NOT deviate from the established visual language if this is a known IP. Fans expect authenticity.
  If this is NOT based on a known IP, you may use creative freedom while maintaining thematic consistency.
</ip_fidelity_requirements>`;

export default ipFidelityRequirements;
