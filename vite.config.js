import { buildXDC, eruda } from "webxdc-vite-plugins";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [buildXDC(), eruda()],
});
