/**
 * List Tool Handler
 */

import { LIST_TOOL, getTypedArgs } from "../../tools";
import { registerToolHandler } from "../toolHandlerRegistry";

// Generic List Handler - delegates to GameDatabase.list
registerToolHandler(LIST_TOOL, (args, ctx) => {
  const typedArgs = getTypedArgs("list", args);
  return ctx.db.list(
    typedArgs.type,
    typedArgs.page,
    typedArgs.limit,
    typedArgs.search,
  );
});
