import { z } from "zod";
import { vfsSchemaRegistry } from "./tools/schemaRegistry";

/**
 * @deprecated Use vfsSchemaRegistry.getForPath from vfs/tools/schemaRegistry.
 */
export function getSchemaForPath(path: string): z.ZodSchema {
  return vfsSchemaRegistry.getForPath(path).schema;
}

export { vfsSchemaRegistry };
