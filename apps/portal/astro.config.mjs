import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://emanuelindustri-source.github.io",
  base: "/factronics-fv",
  output: "static",
  build: {
    inlineStylesheets: "auto"
  }
});
