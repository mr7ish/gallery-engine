import { expect, test } from "@playwright/test";

test("virtual scroll renders only visible items and recycles old items", async ({ page }) => {
  await page.setViewportSize({
    width: 800,
    height: 600
  });
  await page.setContent(`
    <section
      id="viewport"
      style="height: 300px; overflow: auto; position: relative; border: 1px solid #ccc"
      data-start="0"
      data-end="-1"
      data-recycled=""
    >
      <div id="spacer" style="position: relative"></div>
    </section>
  `);

  await page.evaluate(() => {
    const totalCount = 100;
    const itemHeight = 40;
    const overscan = 1;
    const viewport = document.querySelector<HTMLElement>("#viewport");
    const spacer = document.querySelector<HTMLElement>("#spacer");
    let retainedIds = new Set<string>();
    const recycledHistory = new Set<string>();

    if (!viewport || !spacer) {
      throw new Error("Expected virtual scroll fixture elements.");
    }

    spacer.style.height = `${(totalCount * itemHeight).toString()}px`;

    const render = (): void => {
      const visibleCount = Math.ceil(viewport.clientHeight / itemHeight);
      const firstVisibleIndex = Math.floor(viewport.scrollTop / itemHeight);
      const start = Math.max(0, firstVisibleIndex - overscan);
      const end = Math.min(totalCount - 1, firstVisibleIndex + visibleCount + overscan);
      const nextIds = new Set<string>();
      const fragment = document.createDocumentFragment();

      for (let index = start; index <= end; index += 1) {
        const itemId = `item-${(index + 1).toString()}`;
        const itemElement = document.createElement("article");
        itemElement.className = "virtual-item";
        itemElement.dataset.itemId = itemId;
        itemElement.textContent = `Item ${(index + 1).toString()}`;
        itemElement.style.position = "absolute";
        itemElement.style.top = `${(index * itemHeight).toString()}px`;
        itemElement.style.height = `${itemHeight.toString()}px`;
        itemElement.style.left = "0";
        itemElement.style.right = "0";
        itemElement.style.borderBottom = "1px solid #e5e7eb";
        nextIds.add(itemId);
        fragment.append(itemElement);
      }

      const recycledIds = [...retainedIds].filter((id) => !nextIds.has(id));
      recycledIds.forEach((id) => {
        recycledHistory.add(id);
      });
      retainedIds = nextIds;
      spacer.replaceChildren(fragment);
      viewport.dataset.start = start.toString();
      viewport.dataset.end = end.toString();
      viewport.dataset.recycled = [...recycledHistory].join(",");
    };

    viewport.addEventListener("scroll", render);
    render();
  });

  const viewport = page.locator("#viewport");
  const items = page.locator(".virtual-item");

  await expect(viewport).toHaveAttribute("data-start", "0");
  await expect(viewport).toHaveAttribute("data-end", "9");
  await expect(items).toHaveCount(10);
  await expect(items.first()).toHaveText("Item 1");

  await viewport.evaluate((element) => {
    element.scrollTop = 800;
    element.dispatchEvent(new Event("scroll"));
  });

  await expect(viewport).toHaveAttribute("data-start", "19");
  await expect(viewport).toHaveAttribute("data-end", "29");
  await expect(items).toHaveCount(11);
  await expect(items.first()).toHaveText("Item 20");
  await expect(items.last()).toHaveText("Item 30");
  await expect(viewport).toHaveAttribute("data-recycled", /item-1/);
});
