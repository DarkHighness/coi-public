
import { storyOutlineSchema, gameResponseSchema, summarySchema } from "../services/schemas";
import { convertJsonSchemaToOpenAI, convertJsonSchemaToGemini } from "../services/schemaUtils";

const schemas = {
  storyOutlineSchema,
  gameResponseSchema,
  summarySchema
};

async function runTests() {
  console.log("Starting Schema Conversion Tests...");
  let failed = false;

  for (const [name, schema] of Object.entries(schemas)) {
    console.log(`\nTesting ${name}...`);

    // Test OpenAI Conversion
    try {
      console.log(`  Converting to OpenAI...`);
      const openAISchema = convertJsonSchemaToOpenAI(schema);
      console.log(`  ✅ OpenAI Conversion Successful`);
      // console.log(JSON.stringify(openAISchema, null, 2));

      // Basic validation of OpenAI schema structure
      if (!openAISchema.strict) throw new Error("OpenAI schema missing 'strict: true'");
      if (openAISchema.name !== "response") throw new Error("OpenAI schema missing 'name: response'");
      if (!openAISchema.schema) throw new Error("OpenAI schema missing 'schema' property");

    } catch (error) {
      console.error(`  ❌ OpenAI Conversion Failed:`, error);
      failed = true;
    }

    // Test Gemini Conversion
    try {
      console.log(`  Converting to Gemini...`);
      const geminiSchema = convertJsonSchemaToGemini(schema);
      console.log(`  ✅ Gemini Conversion Successful`);
      // console.log(JSON.stringify(geminiSchema, null, 2));
    } catch (error) {
      console.error(`  ❌ Gemini Conversion Failed:`, error);
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
