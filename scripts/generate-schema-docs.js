const fs = require("fs");
const path = require("path");

const INPUT_FILE = path.join(__dirname, "../services/zodSchemas.ts");
const OUTPUT_FILE = path.join(__dirname, "../docs/SCHEMA_DOCS.md");

// Ensure docs directory exists
const docsDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const content = fs.readFileSync(INPUT_FILE, "utf-8");
const lines = content.split("\n");

let currentSection = "General";
let output =
  "# Game Data Schema Documentation\n\n> Auto-generated from `services/zodSchemas.ts`\n\n";

const sections = {};

let currentSchemaName = null;
let currentSchemaFields = [];

// Regex patterns
const SECTION_REGEX = /\/\/ ===+\s+(.+?)\s+===+/;
const SCHEMA_START_REGEX = /export const (\w+) = z\.object\({/;
const FIELD_REGEX = /^\s+(\w+): z\.(.+?),?$/;
const DESCRIBE_REGEX = /\.describe\(\s*"(.+?)"\s*\)/;
const TYPE_REGEX = /z\.(\w+)\(/;

// Helper to flush current schema
function flushSchema() {
  if (currentSchemaName && currentSchemaFields.length > 0) {
    if (!sections[currentSection]) sections[currentSection] = [];
    sections[currentSection].push({
      name: currentSchemaName,
      fields: currentSchemaFields,
    });
    currentSchemaName = null;
    currentSchemaFields = [];
  }
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Check for section header
  const sectionMatch = line.match(SECTION_REGEX);
  if (sectionMatch) {
    flushSchema();
    currentSection = sectionMatch[1].replace("Schemas", "").trim();
    continue;
  }

  // Check for schema start
  const schemaMatch = line.match(SCHEMA_START_REGEX);
  if (schemaMatch) {
    flushSchema();
    currentSchemaName = schemaMatch[1];
    continue;
  }

  // If inside a schema, parse fields
  if (currentSchemaName) {
    // Check for end of schema
    if (line.trim() === "});" || line.trim() === "})") {
      flushSchema();
      continue;
    }

    // Parse field
    // This is a simplified parser and might miss multi-line definitions,
    // but the file seems well-formatted.
    // We'll try to capture the field name and the rest of the line(s) until comma

    const fieldMatch = line.match(/^\s+(\w+):/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      let fieldDef = line
        .trim()
        .substring(fieldName.length + 1)
        .trim();

      // Handle multi-line descriptions or chains
      let j = i;
      while (
        !fieldDef.endsWith(",") &&
        !fieldDef.endsWith("})") &&
        j < lines.length - 1
      ) {
        j++;
        fieldDef += " " + lines[j].trim();
      }
      // Update main loop index if we consumed lines
      // Actually, let's just look at the accumulated string for this field

      // Extract type
      let type = "unknown";
      if (fieldDef.includes("z.string()")) type = "string";
      else if (fieldDef.includes("z.number()")) type = "number";
      else if (fieldDef.includes("z.boolean()")) type = "boolean";
      else if (fieldDef.includes("z.array(")) type = "array";
      else if (fieldDef.includes("z.enum(")) type = "enum";
      else if (fieldDef.includes("z.object(")) type = "object";
      else {
        // Try to find referenced schema
        const refMatch = fieldDef.match(/(\w+Schema)/);
        if (refMatch) type = `[${refMatch[1]}](#${refMatch[1].toLowerCase()})`;
      }

      if (fieldDef.includes(".optional()")) type += " (opt)";

      // Extract description
      const descMatch = fieldDef.match(DESCRIBE_REGEX);
      const description = descMatch ? descMatch[1] : "-";

      currentSchemaFields.push({ name: fieldName, type, description });
    }
  }
}

flushSchema();

// Generate Markdown
for (const [sectionName, schemas] of Object.entries(sections)) {
  output += `## ${sectionName}\n\n`;

  for (const schema of schemas) {
    output += `### ${schema.name}\n\n`;
    output += `| Field | Type | Description |\n`;
    output += `| :--- | :--- | :--- |\n`;

    for (const field of schema.fields) {
      output += `| \`${field.name}\` | ${field.type} | ${field.description} |\n`;
    }
    output += `\n`;
  }
}

fs.writeFileSync(OUTPUT_FILE, output);
console.log(`Documentation generated at ${OUTPUT_FILE}`);
