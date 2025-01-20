import type cheerio from "cheerio";
import { load } from "cheerio";
import { consts } from "./consts";

async function getHtml(
  url: string
): Promise<ReturnType<typeof cheerio.load> | undefined> {
  console.info(`url: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        "Cache-Control": "max-age=3600, stale-while-revalidate=600",
      },
    });
    if (!res.ok) throw new Error("Failed to fetch html");
    const html = await res.text();
    const $ = load(html);
    return $;
  } catch (error) {
    console.error(error);
  }

  return undefined;
}

export const fetchInfo = async (
  slug: string
): Promise<
  | {
      slug: string;
      rating: string;
      poster: string;
      stars: string;
    }
  | undefined
> => {
  console.info(`slug: ${slug}`);

  try {
    const $rating = await getHtml(
      `https://letterboxd.com/csi/film/${slug}/rating-histogram/`
    );
    if (!$rating) return undefined;
    const rating = $rating("span.average-rating").text().trim();

    const $poster = await getHtml(
      `https://letterboxd.com/ajax/poster/film/${slug}/hero/230x345/?k=_45aa59a6`
    );
    if (!$poster) return undefined;
    let poster = $poster("img").attr("src");
    if (!poster) {
      console.error("No poster found");
      poster = consts.errorImageUrl;
    }

    const stars = `${+rating} / 5`;

    // const stars = `${"★".repeat(Math.floor(+rating))}${
    //   +rating % 1 > 0.5 ? "½" : ""
    // }`;

    return { rating, slug, poster, stars };
  } catch (error) {
    console.error(error);
  }

  return undefined;
};
