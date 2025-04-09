import { Hono } from "hono";
import { fetchInfo } from "./letterboxd.js";
import { Jimp, loadFont } from "jimp";
import { SANS_16_WHITE, SANS_32_WHITE } from "jimp/fonts";
import { join } from "node:path";
import { config } from "./config.js";
import { serve } from "@hono/node-server";
import { envVars } from "./envVars.js";

const MAX_WIDTH = 230;
const MAX_HEIGHT = 345;

const app = new Hono();

const __dirname = new URL(".", import.meta.url).pathname.slice(1);

const loadAssets = async () => {
  const pathToAssets = join(__dirname, "..", "assets");
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

app.get("/", async (c) => {
  return c.notFound();
});

app.get("/:slug/info", async (c) => {
  try {
    const { slug } = c.req.param();
    const info = await fetchInfo(slug);
    if (!info) {
      return c.notFound();
    }

    return c.json(info);
  } catch (error) {
    console.error(error);
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

    c.header("Cache-Control", "max-age=86400, stale-while-revalidate=1800");
    c.header("Content-Type", "image/png");
    return c.body(postered);
  } catch (error) {
    console.error(error);
  }

  return c.notFound();
});

serve({
  fetch: app.fetch,
  port: envVars.PORT,
});
