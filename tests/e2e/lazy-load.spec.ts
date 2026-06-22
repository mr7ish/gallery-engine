import { expect, test } from "@playwright/test";

const loadedImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2260%22%3E%3Crect%20width%3D%2280%22%20height%3D%2260%22%20fill%3D%22%232563eb%22%2F%3E%3C%2Fsvg%3E";

test("lazy load image when it enters the viewport", async ({ page }) => {
  await page.setViewportSize({
    width: 800,
    height: 600
  });
  await page.setContent(`
    <main>
      <section style="height: 1200px">before</section>
      <img
        id="lazy-image"
        alt="Lazy loaded gallery item"
        width="80"
        height="60"
        data-src="${loadedImageSrc}"
        data-load-count="0"
      />
      <section style="height: 1200px">after</section>
    </main>
  `);

  await page.evaluate(() => {
    const image = document.querySelector<HTMLImageElement>("#lazy-image");

    if (!image) {
      throw new Error("Expected lazy image element.");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
            continue;
          }

          const target = entry.target;

          if (!(target instanceof HTMLImageElement)) {
            continue;
          }

          const imageSrc = target.dataset.src;

          if (!imageSrc) {
            continue;
          }

          target.src = imageSrc;
          target.dataset.loaded = "true";
          target.dataset.loadCount = String(Number(target.dataset.loadCount ?? "0") + 1);
          observer.unobserve(target);
        }
      },
      {
        rootMargin: "0px",
        threshold: 0.25
      }
    );

    observer.observe(image);
  });

  const image = page.locator("#lazy-image");

  await expect(image).not.toHaveAttribute("src", loadedImageSrc);

  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("data-loaded", "true");
  await expect(image).toHaveAttribute("src", loadedImageSrc);
  await expect(image).toHaveAttribute("data-load-count", "1");

  await page.mouse.wheel(0, -1200);
  await image.scrollIntoViewIfNeeded();

  await expect(image).toHaveAttribute("data-load-count", "1");
});
