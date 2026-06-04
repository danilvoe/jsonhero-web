import { isOffline } from "~/utilities/isOffline";

export async function getStarCount(): Promise<number | undefined> {
  if (isOffline()) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(
      `https://api.github.com/repos/triggerdotdev/jsonhero-web`,
      {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
        },
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: {
            "200-299": 300,
            "400-499": 5,
            "500-599": 0,
          },
        },
      }
    );

    if (!response.ok) {
      console.error(`Could not fetch star count: ${response.statusText}`);

      return;
    }

    const data = await response.json();
    return data.stargazers_count;
  } catch (error) {
    console.error(error);
    return;
  } finally {
    clearTimeout(timeout);
  }
}
