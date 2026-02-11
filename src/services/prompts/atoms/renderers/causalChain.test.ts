import { describe, expect, it } from "vitest";
import {
  renderCausalChainFull,
  renderCausalChainHidden,
  renderCausalChainVisible,
} from "./causalChain";

describe("causalChain renderer", () => {
  const chain = {
    chainId: "chain:collapse",
    status: "active",
    rootCause: {
      eventId: "evt:collapse",
      description: "The seal at iron gate failed",
    },
    pendingConsequences: [
      {
        id: "c1",
        description: "Market panic",
        knownBy: ["char:player"],
        triggered: false,
        triggerCondition: "if rumor spreads",
        severity: "high",
      },
      {
        id: "c2",
        description: "Council purge",
        knownBy: ["npc:warden"],
        triggered: true,
      },
    ],
  } as any;

  it("renders visible layer with only player-known consequences", () => {
    const output = renderCausalChainVisible({ chain });

    expect(output).toContain('<causal_chain id="chain:collapse" layer="visible">');
    expect(output).toContain("rootCause: The seal at iron gate failed");
    expect(output).toContain("knownConsequences: [c1] Market panic");
    expect(output).not.toContain("Council purge");
  });

  it("renders hidden layer with all consequences and defaults", () => {
    const output = renderCausalChainHidden({ chain });

    expect(output).toContain('<causal_chain id="chain:collapse" layer="hidden">');
    expect(output).toContain("rootCause: { eventId: evt:collapse");
    expect(output).toContain("allConsequences:");
    expect(output).toContain("trigger: none");
    expect(output).toContain("severity: normal");
  });

  it("renders full layer with separated visible/hidden blocks", () => {
    const output = renderCausalChainFull({ chain });

    expect(output).toContain('<causal_chain id="chain:collapse" layer="full">');
    expect(output).toContain("<visible>");
    expect(output).toContain("<hidden>");
    expect(output).toContain("rootCauseEventId: evt:collapse");
    expect(output).toContain("pendingConsequences:");
  });

  it("handles chains with no root cause or consequences", () => {
    const output = renderCausalChainVisible({
      chain: {
        chainId: "chain:quiet",
        status: "resolved",
        pendingConsequences: [],
      },
    } as any);

    expect(output).toContain("chainId: chain:quiet");
    expect(output).not.toContain("knownConsequences:");
    expect(output).not.toContain("rootCause:");
  });
});
