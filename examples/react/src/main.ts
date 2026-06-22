import { createElement, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { Gallery, Renderer } from "@gallery-engine/core";
import type { GalleryImage, RenderItem } from "@gallery-engine/core";
import { GridLayout } from "@gallery-engine/layouts";
import "./styles.css";

const images: readonly GalleryImage[] = Array.from({ length: 9 }, (_, index) => ({
  id: `react-${String(index + 1)}`,
  src: createSvgDataUri(900, 640, 210 + index * 9, `React ${String(index + 1)}`),
  alt: `React gallery image ${String(index + 1)}`,
  width: 900,
  height: 640
}));

export function ReactGalleryExample(): ReactElement {
  const containerRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const gallery = new Gallery({
      container,
      images,
      layout: {
        type: "grid",
        grid: {
          columns: 3,
          gap: 16
        }
      }
    });
    const renderer = new Renderer({ container });
    const grid = new GridLayout<GalleryImage>({
      minColumnWidth: 260,
      gap: 16
    });
    const render = (): void => {
      const layoutResult = grid.calculate(images, {
        containerWidth: container.clientWidth
      });
      const renderItems = layoutResult.items.map((item, index): RenderItem => {
        const image = images[index];

        if (!image) {
          throw new Error(`Missing image for ${item.id}.`);
        }

        return {
          ...item,
          image
        };
      });

      container.style.height = `${String(layoutResult.height)}px`;
      renderer.render(renderItems);
      setStatus(`rendered ${String(renderItems.length)} items`);
    };

    gallery.on("mounted", render);
    gallery.on("layout:update", render);
    gallery.init();

    window.addEventListener("resize", render);

    return () => {
      window.removeEventListener("resize", render);
      renderer.destroy();
      gallery.destroy();
    };
  }, []);

  return createElement(
    "main",
    {
      className: "react-example"
    },
    createElement(
      "header",
      {
        className: "react-example__header"
      },
      createElement(
        "div",
        null,
        createElement("p", null, "React"),
        createElement("h1", null, "Gallery Engine")
      ),
      createElement("span", null, status)
    ),
    createElement("section", {
      ref: containerRef,
      className: "react-example__gallery",
      "aria-label": "React Gallery Engine example"
    })
  );
}

const rootElement = document.querySelector("#root");

if (!rootElement) {
  throw new Error("Missing React root element.");
}

createRoot(rootElement).render(createElement(ReactGalleryExample));

function createSvgDataUri(width: number, height: number, hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><rect width="100%" height="100%" fill="hsl(${String(hue)} 62% 45%)"/><text x="40" y="${String(height - 48)}" font-family="Arial" font-size="44" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
