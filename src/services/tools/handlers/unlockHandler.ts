/**
 * Unlock Entity Tool Handler
 */

import { UNLOCK_ENTITY_TOOL, getTypedArgs } from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";

// Unlock Entity - delegates to existing GameDatabase.unlock
registerToolHandler(UNLOCK_ENTITY_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("unlock_entity", args);
  return ctx.db.unlock(
    typedArgs.category,
    { id: typedArgs.id, name: typedArgs.name },
    typedArgs.reason,
  );
});
