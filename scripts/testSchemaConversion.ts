/**
 * Schema Conversion Tests
 * 测试 Zod 到各 Provider 格式的编译
 */

import {
  storyOutlineSchema,
  gameResponseSchema,
  storySummarySchema,
} from "../services/zodSchemas";
import {
  zodToGemini,
  zodToOpenAIResponseFormat,
  zodToOpenAISchema,
} from "../services/zodCompiler";

const schemas = {
  storyOutlineSchema,
  gameResponseSchema,
  storySummarySchema,
};

async function runTests() {
  console.log("Starting Zod to Provider Schema Compilation Tests...");
  let failed = false;

  for (const [name, schema] of Object.entries(schemas)) {
    console.log(`\nTesting ${name}...`);

    // Test OpenAI Response Format Conversion
    try {
      console.log(`  Compiling to OpenAI Response Format...`);
      const openAIFormat = zodToOpenAIResponseFormat(schema, name);
      console.log(`  ✅ OpenAI Response Format Compilation Successful`);

      // Basic validation of OpenAI schema structure
      if (openAIFormat.type !== "json_schema")
        throw new Error("OpenAI format missing 'type: json_schema'");
      if (!openAIFormat.json_schema.strict)
        throw new Error("OpenAI schema missing 'strict: true'");
      if (!openAIFormat.json_schema.schema)
        throw new Error("OpenAI schema missing 'schema' property");
    } catch (error) {
      console.error(`  ❌ OpenAI Response Format Compilation Failed:`, error);
      failed = true;
    }

    // Test OpenAI Schema Conversion
    try {
      console.log(`  Compiling to OpenAI Schema...`);
      const openAISchema = zodToOpenAISchema(schema);
      console.log(`  ✅ OpenAI Schema Compilation Successful`);

      // Basic validation
      if (!openAISchema.type)
        throw new Error("OpenAI schema missing 'type' property");
    } catch (error) {
      console.error(`  ❌ OpenAI Schema Compilation Failed:`, error);
      failed = true;
    }

    // Test Gemini Conversion
    try {
      console.log(`  Compiling to Gemini...`);
      const geminiSchema = zodToGemini(schema);
      console.log(`  ✅ Gemini Compilation Successful`);
      // console.log(JSON.stringify(geminiSchema, null, 2));
    } catch (error) {
      console.error(`  ❌ Gemini Compilation Failed:`, error);
      failed = true;
    }
  }

  if (failed) {
    console.error("\n❌ Some tests failed.");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed.");
  }
}

runTests();
