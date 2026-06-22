import { expect, test } from "@playwright/test";

test("infinite scroll loads batches near the bottom", async ({ page }) => {
  await page.setViewportSize({
    width: 800,
    height: 600
  });
  await page.setContent(`
    <section
      id="viewport"
      style="height: 320px; overflow: auto; border: 1px solid #ccc"
      data-loaded-count="0"
      data-load-events="0"
    >
      <div id="items"></div>
    </section>
  `);

  await page.evaluate(() => {
    const totalItems = Array.from({ length: 18 }, (_, index) => `Image ${(index + 1).toString()}`);
    const batchSize = 6;
    const threshold = 24;
    const viewport = document.querySelector<HTMLElement>("#viewport");
    const itemsElement = document.querySelector<HTMLElement>("#items");

    if (!viewport || !itemsElement) {
      throw new Error("Expected infinite scroll fixture elements.");
    }

    let loadedCount = 0;
    let loadEvents = 0;

    const renderItems = (): void => {
      itemsElement.replaceChildren(
        ...totalItems.slice(0, loadedCount).map((label) => {
          const itemElement = document.createElement("article");
          itemElement.className = "gallery-item";
          itemElement.textContent = label;
          itemElement.style.height = "96px";
          itemElement.style.borderBottom = "1px solid #e5e7eb";
          itemElement.style.boxSizing = "border-box";

          return itemElement;
        })
      );
      viewport.dataset.loadedCount = String(loadedCount);
      viewport.dataset.loadEvents = String(loadEvents);
    };

    const loadMore = (): void => {
      const nextCount = Math.min(loadedCount + batchSize, totalItems.length);

      if (nextCount === loadedCount) {
        return;
      }

      loadedCount = nextCount;
      loadEvents += 1;
      renderItems();
    };

    const isNearBottom = (): boolean =>
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= threshold;

    viewport.addEventListener("scroll", () => {
      if (isNearBottom()) {
        loadMore();
      }
    });

    loadMore();
  });

  const viewport = page.locator("#viewport");
  const items = page.locator(".gallery-item");

  await expect(viewport).toHaveAttribute("data-loaded-count", "6");
  await expect(viewport).toHaveAttribute("data-load-events", "1");
  await expect(items).toHaveCount(6);

  await viewport.evaluate((element) => {
    element.scrollTop = 64;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect(viewport).toHaveAttribute("data-loaded-count", "6");

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect(viewport).toHaveAttribute("data-loaded-count", "12");
  await expect(viewport).toHaveAttribute("data-load-events", "2");
  await expect(items).toHaveCount(12);
  await expect(items.nth(11)).toHaveText("Image 12");

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect(viewport).toHaveAttribute("data-loaded-count", "18");
  await expect(viewport).toHaveAttribute("data-load-events", "3");
  await expect(items).toHaveCount(18);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect(viewport).toHaveAttribute("data-loaded-count", "18");
  await expect(viewport).toHaveAttribute("data-load-events", "3");
});
