import { envVars } from "./envVars";
import express from "express";
import cors from "cors";
import { fetchInfo } from "./letterboxd";
import { template } from "./template";
import htmlToImage from "node-html-to-image";

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

  res.status(404).send();
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

    const postered = await htmlToImage({
      html: poster,
    });

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
