/**
 * Causal Chain Tool Handlers
 */

import {
  ADD_CAUSAL_CHAIN_TOOL,
  UPDATE_CAUSAL_CHAIN_TOOL,
  REMOVE_CAUSAL_CHAIN_TOOL,
  TRIGGER_CAUSAL_CHAIN_TOOL,
  RESOLVE_CAUSAL_CHAIN_TOOL,
  INTERRUPT_CAUSAL_CHAIN_TOOL,
  QUERY_CAUSAL_CHAIN_TOOL,
  getTypedArgs,
} from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";
import type { CausalChain } from "../../../types";
import { createSuccess, createError } from "../../gameDatabase";

// Add Causal Chain
registerToolHandler(ADD_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("add_causal_chain", args);

  if (!typedArgs.chainId) {
    return createError("Chain ID is required", "INVALID_DATA");
  }
  if (!typedArgs.rootCause) {
    return createError("Root cause is required", "INVALID_DATA");
  }

  if (db.getCausalChainById(typedArgs.chainId)) {
    return createError(
      `Chain "${typedArgs.chainId}" already exists`,
      "ALREADY_EXISTS",
    );
  }

  const newChain: CausalChain = {
    chainId: typedArgs.chainId,
    rootCause: typedArgs.rootCause,
    events: [], // Match original modifyCausalChain logic
    status: typedArgs.status || "active",
    pendingConsequences: typedArgs.pendingConsequences,
  };

  db.addCausalChain(newChain);
  return createSuccess(newChain, `Added causal chain: ${typedArgs.chainId}`);
});

// Update Causal Chain
registerToolHandler(UPDATE_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("update_causal_chain", args);

  if (!typedArgs.chainId) {
    return createError("Chain ID is required", "INVALID_DATA");
  }

  const chain = db.getCausalChainById(typedArgs.chainId);
  if (!chain) {
    return createError(`Chain "${typedArgs.chainId}" not found`, "NOT_FOUND");
  }

  db.updateCausalChain(typedArgs.chainId, {
    status: typedArgs.status,
    pendingConsequences: typedArgs.pendingConsequences,
  });

  return createSuccess(chain, `Updated causal chain: ${typedArgs.chainId}`);
});

// Remove Causal Chain
registerToolHandler(REMOVE_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("remove_causal_chain", args);

  if (!typedArgs.chainId) {
    return createError("Chain ID is required", "INVALID_DATA");
  }

  const success = db.removeCausalChain(typedArgs.chainId);
  if (!success) {
    return createError(
      `Causal chain "${typedArgs.chainId}" not found`,
      "NOT_FOUND",
    );
  }

  return createSuccess(
    { removed: typedArgs.chainId },
    `Removed causal chain: ${typedArgs.chainId}`,
  );
});

// Trigger Causal Chain
registerToolHandler(TRIGGER_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("trigger_causal_chain", args);

  if (!typedArgs.chainId || !typedArgs.consequenceId) {
    return createError(
      "Chain ID and consequence ID are required",
      "INVALID_DATA",
    );
  }

  return db.triggerConsequence(typedArgs.chainId, typedArgs.consequenceId);
});

// Resolve Causal Chain
registerToolHandler(RESOLVE_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("resolve_causal_chain", args);

  if (!typedArgs.chainId) {
    return createError("Chain ID is required", "INVALID_DATA");
  }

  const chain = db.getCausalChainById(typedArgs.chainId);
  if (!chain) {
    return createError(`Chain "${typedArgs.chainId}" not found`, "NOT_FOUND");
  }

  db.updateCausalChain(typedArgs.chainId, { status: "resolved" });
  return createSuccess(
    { chainId: typedArgs.chainId, status: "resolved" },
    `Resolved causal chain: ${typedArgs.chainId}`,
  );
});

// Interrupt Causal Chain
registerToolHandler(INTERRUPT_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  const { db } = ctx;
  const typedArgs = getTypedArgs("interrupt_causal_chain", args);

  if (!typedArgs.chainId) {
    return createError("Chain ID is required", "INVALID_DATA");
  }

  const chain = db.getCausalChainById(typedArgs.chainId);
  if (!chain) {
    return createError(`Chain "${typedArgs.chainId}" not found`, "NOT_FOUND");
  }

  db.updateCausalChain(typedArgs.chainId, { status: "interrupted" });
  return createSuccess(
    { chainId: typedArgs.chainId, status: "interrupted" },
    `Interrupted causal chain: ${typedArgs.chainId}`,
  );
});

// Query Causal Chains
registerToolHandler(QUERY_CAUSAL_CHAIN_TOOL, (args, ctx) => {
  return ctx.db.query("causal_chain", args.query as string, undefined, {
    page: args.page as number,
    limit: args.limit as number,
  });
});
