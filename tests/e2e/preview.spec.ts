import { expect, test } from "@playwright/test";

const imageSources = [
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2280%22%3E%3Crect%20width%3D%22120%22%20height%3D%2280%22%20fill%3D%22%232563eb%22%2F%3E%3C%2Fsvg%3E",
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2280%22%3E%3Crect%20width%3D%22120%22%20height%3D%2280%22%20fill%3D%22%2316a34a%22%2F%3E%3C%2Fsvg%3E",
  "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2280%22%3E%3Crect%20width%3D%22120%22%20height%3D%2280%22%20fill%3D%22%23dc2626%22%2F%3E%3C%2Fsvg%3E"
] as const;

test("preview opens, navigates, zooms, and closes", async ({ page }) => {
  await page.setContent(`
    <main>
      <button data-preview-index="0">Open first</button>
      <button data-preview-index="1">Open second</button>
      <button data-preview-index="2">Open third</button>
      <dialog id="preview" aria-label="Image preview">
        <button id="previous" type="button">Previous</button>
        <figure>
          <img id="preview-image" alt="" />
          <figcaption id="preview-title"></figcaption>
        </figure>
        <button id="next" type="button">Next</button>
        <button id="zoom-in" type="button">Zoom in</button>
        <button id="close" type="button">Close</button>
      </dialog>
    </main>
  `);

  await page.evaluate((sources) => {
    const items = sources.map((src, index) => ({
      id: `image-${(index + 1).toString()}`,
      src,
      title: `Image ${(index + 1).toString()}`
    }));
    const preview = document.querySelector<HTMLDialogElement>("#preview");
    const image = document.querySelector<HTMLImageElement>("#preview-image");
    const title = document.querySelector<HTMLElement>("#preview-title");
    const next = document.querySelector<HTMLButtonElement>("#next");
    const previous = document.querySelector<HTMLButtonElement>("#previous");
    const close = document.querySelector<HTMLButtonElement>("#close");
    const zoomIn = document.querySelector<HTMLButtonElement>("#zoom-in");

    if (!preview || !image || !title || !next || !previous || !close || !zoomIn) {
      throw new Error("Expected preview fixture elements.");
    }

    let currentIndex = 0;
    let zoom = 1;

    const render = (): void => {
      const item = items[currentIndex];

      if (!item) {
        throw new Error("Expected preview item.");
      }

      image.src = item.src;
      image.alt = item.title;
      image.style.transform = `scale(${zoom.toString()})`;
      preview.dataset.current = currentIndex.toString();
      preview.dataset.zoom = zoom.toString();
      title.textContent = item.title;
    };

    const open = (index: number): void => {
      currentIndex = Math.min(Math.max(0, index), items.length - 1);
      zoom = 1;
      render();
      preview.showModal();
    };

    const move = (direction: number): void => {
      currentIndex = (currentIndex + direction + items.length) % items.length;
      zoom = 1;
      render();
    };

    document.querySelectorAll<HTMLButtonElement>("[data-preview-index]").forEach((button) => {
      button.addEventListener("click", () => {
        open(Number(button.dataset.previewIndex ?? "0"));
      });
    });
    next.addEventListener("click", () => {
      move(1);
    });
    previous.addEventListener("click", () => {
      move(-1);
    });
    zoomIn.addEventListener("click", () => {
      zoom = Math.min(2, zoom + 0.5);
      render();
    });
    close.addEventListener("click", () => {
      preview.close();
    });
    document.addEventListener("keydown", (event) => {
      if (!preview.open) {
        return;
      }

      if (event.key === "ArrowRight") {
        move(1);
      }

      if (event.key === "ArrowLeft") {
        move(-1);
      }

      if (event.key === "Escape") {
        preview.close();
      }
    });
  }, imageSources);

  const preview = page.locator("#preview");
  const image = page.locator("#preview-image");

  await page.getByRole("button", { name: "Open second" }).click();

  await expect(preview).toHaveAttribute("open", "");
  await expect(preview).toHaveAttribute("data-current", "1");
  await expect(image).toHaveAttribute("alt", "Image 2");

  await page.keyboard.press("ArrowRight");
  await expect(preview).toHaveAttribute("data-current", "2");
  await expect(image).toHaveAttribute("alt", "Image 3");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(preview).toHaveAttribute("data-zoom", "1.5");

  await page.keyboard.press("ArrowLeft");
  await expect(preview).toHaveAttribute("data-current", "1");
  await expect(preview).toHaveAttribute("data-zoom", "1");

  await page.keyboard.press("Escape");
  await expect(preview).not.toHaveAttribute("open", "");
});
