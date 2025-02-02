import { envVars } from "./envVars";
import express from "express";
import cors from "cors";
import { fetchInfo } from "./letterboxd";
import { template } from "./template";
import { Jimp, loadFont } from "jimp";
import { SANS_16_WHITE, SANS_32_WHITE } from "jimp/fonts";
import { join } from "node:path";
import { config } from "./config";

const MAX_WIDTH = 230;
const MAX_HEIGHT = 345;

const app = express();
app.use(cors());

const loadAssets = async () => {
  try {
    const banner = (
      await Jimp.read(join(__dirname, "..", "assets", "banner.png"))
    ).scaleToFit({ w: MAX_WIDTH, h: MAX_HEIGHT });
    const half = (
      await Jimp.read(join(__dirname, "..", "assets", "half.png"))
    ).scaleToFit({
      w: 16,
      h: 16,
    });
    const star = (
      await Jimp.read(join(__dirname, "..", "assets", "star.png"))
    ).scaleToFit({
      w: 16,
      h: 16,
    });

    return { banner, half, star };
  } catch (error) {
    console.error("Couldn't load assets.");
    console.error(error);
  }
  return undefined;
};
let assets: Awaited<ReturnType<typeof loadAssets>> | undefined;
loadAssets().then((a) => {
  assets = a;
  console.info("Assets loaded.");
});

app.get("/", (req, res) => {
  res.status(200).send("Hello world");
});

app.get("/:slug/info", async (req, res) => {
  try {
    const { slug } = req.params;
    const info = await fetchInfo(slug);
    if (!info) {
      res.status(404).send();
      return;
    }

    res.status(200).json(info);
    return;
  } catch (error) {
    console.error(error);
  }

  res.status(500).send();
});

app.get("/:slug/:config?", async (req, res) => {
  // early exit if assets are not loaded
  if (!assets) {
    res.status(500).send();
    return;
  }

  try {
    const { slug } = req.params;
    const info = await fetchInfo(slug);
    if (!info) {
      res.status(404).send();
      return;
    }

    const providedConfig = req.params.config
      ? config.decode(req.params.config)
      : undefined;

    console.info({ slug, info, providedConfig });

    const postered = await (async () => {
      // read info.poster as buffer from a fetch
      const posterBuffer = await fetch(info.poster).then((res) =>
        res.arrayBuffer()
      );

      const font = await loadFont(SANS_32_WHITE);
      const rating = new Jimp({ width: 230, height: 345 }).print({
        font,
        x: 0,
        y: 0,
        text: info.stars,
      });
      rating.background = 0x000000;

      const compositedInitial = await Jimp.fromBuffer(posterBuffer);
      let composited = compositedInitial
        .scaleToFit({ w: MAX_WIDTH, h: MAX_HEIGHT })
        .blit({
          src: assets.banner,
          x: 0,
          y: MAX_HEIGHT - assets.banner.bitmap.height,
        });

      // stars
      const padding = 8;
      const startX = MAX_WIDTH - assets.star.bitmap.width - padding;
      let stars = new Jimp({
        width: MAX_WIDTH,
        height: assets.star.bitmap.height,
      }).brightness(100);
      const remainder = +info.rating % 1;
      if (remainder > 0) {
        stars = stars.blit({
          src: assets.half,
          x: MAX_WIDTH - assets.half.width - padding,
          y: 0,
        });
      }
      for (let i = 0; i < Math.floor(+info.rating); i++) {
        const x =
          startX -
          i * assets.star.bitmap.width -
          padding -
          (remainder ? assets.half.bitmap.width : 0);
        console.info(`Blitting star ${x}`);
        stars = stars.blit({
          src: assets.star,
          x,
          y: 0,
        });
      }
      composited = composited.blit({
        src: stars,
        x: MAX_WIDTH - stars.bitmap.width - padding,
        y: MAX_HEIGHT - assets.star.bitmap.height - padding,
      });

      return await composited.getBuffer("image/png");
    })();

    res.writeHead(200, {
      "content-type": "image/png",
      // 1 day, revalidate 30 minutes after expiry
      "cache-control": "max-age=86400, stale-while-revalidate=1800",
    });
    res.end(postered, "binary");
    return;
  } catch (error) {
    console.error(error);
  }

  res.status(404).send();
});

app.listen(envVars.PORT, () => {
  console.log(`Server is running on port ${envVars.PORT}`);
});
