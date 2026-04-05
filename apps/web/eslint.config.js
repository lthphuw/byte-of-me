import sharedConfig from "@byte-of-me/eslint-config";

export default [
  ...sharedConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "no-console": "off"
    }
  }
];
