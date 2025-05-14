import { Hono } from "hono";
import logger from "./pino.js";
import { fetchInfo } from "./letterboxd.js";
import { Jimp, loadFont } from "jimp";
import { SANS_16_WHITE, SANS_32_WHITE } from "jimp/fonts";
import path, { join } from "node:path";
import { config } from "./config.js";
import { serve } from "@hono/node-server";
import { envVars } from "./envVars.js";

const MAX_WIDTH = 230;
const MAX_HEIGHT = 345;

const app = new Hono();

const loadAssets = async () => {
  const pathToAssets = path.resolve(".", "assets");
  try {
    const banner = (
      await Jimp.read(join(pathToAssets, "banner.png"))
    ).scaleToFit({ w: MAX_WIDTH, h: MAX_HEIGHT });
    const half = (await Jimp.read(join(pathToAssets, "half.png"))).scaleToFit({
      w: 16,
      h: 16,
    });
    const star = (await Jimp.read(join(pathToAssets, "star.png"))).scaleToFit({
      w: 16,
      h: 16,
    });

    return { banner, half, star } as const;
  } catch (error) {
    logger.error("Couldn't load assets.");
    logger.error(error);
  }
  throw new Error("Couldn't load assets.");
};
let assets: Awaited<ReturnType<typeof loadAssets>> | undefined;
loadAssets()
  .then((a) => {
    assets = a;
    logger.info("Assets loaded.");
  })
  .catch((e) => {
    logger.error("Couldn't load assets.");
    logger.error(e);
    process.exit(1);
  });

app.get("/", async (c) => {
  return c.notFound();
});

app.get("/favicon.ico", async (c) => {
  return c.redirect("https://fav.farm/📽️");
});

function addWeightedRating(
  info: Awaited<ReturnType<typeof fetchInfo>>
):
  | (Awaited<ReturnType<typeof fetchInfo>> & { weightedRating: number })
  | undefined {
  if (!info) {
    return undefined;
  }

  const isBetween = (num: number, min: number, max: number) =>
    num >= min && num < max;

  const rv = { ...info, weightedRating: 0 };

  // 0-1.2
  if (isBetween(info.rating, 0, 1.2)) {
    rv.weightedRating = 1;
  }

  // 1.3-1.7
  if (isBetween(info.rating, 1.2, 1.7)) {
    rv.weightedRating = 1.5;
  }

  // 1.8-2.2
  if (isBetween(info.rating, 1.7, 2.2)) {
    rv.weightedRating = 2;
  }

  // 2.3-2.7
  if (isBetween(info.rating, 2.2, 2.7)) {
    rv.weightedRating = 2.5;
  }

  // 2.8-3.2
  if (isBetween(info.rating, 2.7, 3.2)) {
    rv.weightedRating = 3;
  }

  // 3.3-3.7
  if (isBetween(info.rating, 3.2, 3.7)) {
    rv.weightedRating = 3.5;
  }

  // 3.8-4.2
  if (isBetween(info.rating, 3.7, 4.2)) {
    rv.weightedRating = 4;
  }
  // 4.3-4.5
  if (isBetween(info.rating, 4.2, 4.5)) {
    rv.weightedRating = 4.5;
  }

  // 4.6+
  if (info.rating > 4.5) {
    rv.weightedRating = 5;
  }

  return rv;
}

app.get("/:slug/info", async (c) => {
  try {
    const { slug } = c.req.param();
    const info = await fetchInfo(slug);
    const infoWithWeight = addWeightedRating(info);
    if (!infoWithWeight) {
      return c.notFound();
    }

    return c.json(infoWithWeight);
  } catch (error) {
    logger.error(error);
  }

  return c.text("", 500);
});

app.get("/:slug/:config?", async (c) => {
  // early exit if assets are not loaded
  if (!assets) {
    return c.notFound();
  }

  try {
    const { slug } = c.req.param();
    const info = await fetchInfo(slug);
    if (!info) {
      return c.notFound();
    }

    const configParam = c.req.param("config");
    const providedConfig = configParam ? config.decode(configParam) : undefined;

    logger.debug({ slug, info, providedConfig });

    const postered = await (async () => {
      // read info.poster as buffer from a fetch
      const posterBuffer = await fetch(info.poster).then((res) =>
        res.arrayBuffer()
      );

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

      const infoWithWeight = addWeightedRating(info);

      const blitAgainst = +(infoWithWeight?.weightedRating ?? 0);
      const remainder = blitAgainst % 1;
      if (remainder > 0) {
        stars = stars.blit({
          src: assets.half,
          x: MAX_WIDTH - assets.half.width - padding,
          y: 0,
        });
      }
      for (let i = 0; i < Math.floor(blitAgainst); i++) {
        const x =
          startX -
          i * assets.star.bitmap.width -
          padding -
          (remainder ? assets.half.bitmap.width : 0);
        logger.debug(`Blitting star ${x}`);
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

      // add the rating text
      const font = await loadFont(SANS_16_WHITE);
      composited = composited.print({
        font,
        x: 32,
        y: MAX_HEIGHT - assets.banner.bitmap.height + 8,
        text: info.rating,
      });

      return await composited.getBuffer("image/png");
    })();

    c.header("Cache-Control", "max-age=86400, stale-while-revalidate=1800");
    c.header("Content-Type", "image/png");
    return c.body(postered, 200);
  } catch (error) {
    logger.error(error);
  }

  return c.notFound();
});

serve({
  fetch: app.fetch,
  port: envVars.PORT,
});

logger.info(`Server running on port ${envVars.PORT}`);
