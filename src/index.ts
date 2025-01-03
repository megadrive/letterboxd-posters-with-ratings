import { envVars } from "./envVars";
import express from "express";
import cors from "cors";
import { fetchInfo } from "./letterboxd";
import { template } from "./template";
import { Jimp, loadFont } from "jimp";
import { SANS_14_BLACK, SANS_32_WHITE } from "jimp/fonts";

const app = express();
app.use(cors());

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

app.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const info = await fetchInfo(slug);
    if (!info) {
      res.status(404).send();
      return;
    }

    const poster = `${template}`
      .replace("{{poster}}", info.poster)
      .replace("{{rating}}", info.stars);

    ///////

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
      const composited = compositedInitial.scaleToFit({ w: 230, h: 345 }).blit({
        src: rating,
        x: 0,
        y: 0,
      });
      return await composited.getBuffer("image/png");
    })();
    ///////

    res.writeHead(200, {
      "content-type": "image/png",
      "cache-control": "max-age=86400",
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
