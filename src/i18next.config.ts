import { defineConfig } from "i18next-cli";

export default defineConfig({
  locales: ["en", "zh"],
  extract: {
    input: "**/*.{js,jsx,ts,tsx}",
    output: "public/locales/{{language}}/{{namespace}}.json",
  },
});
