import { createApp, defineComponent, h, onBeforeUnmount, onMounted, ref } from "vue";
import { Gallery, Renderer } from "@gallery-engine/core";
import type { GalleryImage, RenderItem } from "@gallery-engine/core";
import { MasonryLayout } from "@gallery-engine/layouts";
import "./styles.css";

const images: readonly GalleryImage[] = Array.from({ length: 10 }, (_, index) => ({
  id: `vue-${String(index + 1)}`,
  src: createSvgDataUri(760, 520 + (index % 3) * 80, 130 + index * 10, `Vue ${String(index + 1)}`),
  alt: `Vue gallery image ${String(index + 1)}`,
  width: 760,
  height: 520 + (index % 3) * 80
}));

export const VueGalleryExample = defineComponent({
  name: "VueGalleryExample",
  setup() {
    const containerRef = ref<HTMLElement | null>(null);
    const status = ref("idle");
    let gallery: Gallery | undefined;
    let renderer: Renderer | undefined;

    const renderGallery = (): void => {
      const container = containerRef.value;

      if (!container || !renderer) {
        return;
      }

      const layout = new MasonryLayout<GalleryImage>({
        minColumnWidth: 260,
        gap: 16
      });
      const layoutResult = layout.calculate(images, {
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
      status.value = `rendered ${String(renderItems.length)} items`;
    };

    onMounted(() => {
      const container = containerRef.value;

      if (!container) {
        return;
      }

      gallery = new Gallery({
        container,
        images,
        layout: {
          type: "masonry"
        }
      });
      renderer = new Renderer({ container });
      gallery.on("mounted", renderGallery);
      gallery.on("layout:update", renderGallery);
      gallery.init();
      window.addEventListener("resize", renderGallery);
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", renderGallery);
      renderer?.destroy();
      gallery?.destroy();
    });

    return () =>
      h(
        "main",
        {
          class: "vue-example"
        },
        [
          h(
            "header",
            {
              class: "vue-example__header"
            },
            [h("div", [h("p", "Vue"), h("h1", "Gallery Engine")]), h("span", status.value)]
          ),
          h("section", {
            ref: containerRef,
            class: "vue-example__gallery",
            "aria-label": "Vue Gallery Engine example"
          })
        ]
      );
  }
});

const appElement = document.querySelector("#app");

if (!appElement) {
  throw new Error("Missing Vue app element.");
}

createApp(VueGalleryExample).mount(appElement);

function createSvgDataUri(width: number, height: number, hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}"><rect width="100%" height="100%" fill="hsl(${String(hue)} 55% 42%)"/><text x="40" y="${String(height - 48)}" font-family="Arial" font-size="44" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
