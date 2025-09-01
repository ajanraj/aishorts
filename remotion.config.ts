import path from "path";
import { Config } from "@remotion/cli/config";

// Remotion configuration
// Config.setVideoImageFormat("jpeg");
// Config.setOverwriteOutput(true);
// Config.setPixelFormat("yuv420p");
// Config.setCodec("h264");
// Config.setCrf(18);

// Configure webpack for module resolution
Config.overrideWebpackConfig((currentConfiguration) => {
  return {
    ...currentConfiguration,
    resolve: {
      ...currentConfiguration.resolve,
      alias: {
        ...currentConfiguration.resolve?.alias,
        "@": path.resolve(process.cwd(), "src"),
      },
    },
  };
});
