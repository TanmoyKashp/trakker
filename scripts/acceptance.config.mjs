export default {
  input: ["scripts/acceptance-tests.mjs"],
  output: {
    file: "scripts/.acceptance-bundle.mjs",
    format: "esm",
    codeSplitting: false,
  },
  platform: "node",
};
