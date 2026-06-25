# @gallery-engine/plugins

Plugins 提供可插拔的 Gallery 扩展能力：水印、下载、AI 标签和 AI 相似搜索。每个插件都可以安装到 `Gallery` 或兼容的上下文对象中。🧰

## Installation

```bash
pnpm add @gallery-engine/plugins
```

也可以使用 npm：

```bash
npm install @gallery-engine/plugins
```

## Watermark Plugin

```ts
import { Gallery } from "@gallery-engine/core";
import { WatermarkPlugin } from "@gallery-engine/plugins";

const gallery = new Gallery({
  container: "#gallery",
  images: []
});

gallery.use(
  new WatermarkPlugin({
    text: "Gallery Engine",
    position: "bottom-right",
    opacity: 0.72
  })
);

gallery.init();
```

## Download Plugin

```ts
import { DownloadPlugin } from "@gallery-engine/plugins";

const download = new DownloadPlugin({
  filenameTemplate: "{index}-{title}.{extension}"
});

download.install({
  getConfig: () => ({
    images: [
      {
        id: "a",
        src: "/images/a.jpg",
        title: "Morning"
      }
    ]
  })
});

const result = download.download("a");

console.log(result.filename);
```

## AI Tags Plugin

```ts
import { AiTagsPlugin } from "@gallery-engine/plugins";

const tags = new AiTagsPlugin({
  provider: {
    generateTags: async ({ image }) => {
      console.log(`Generate tags for ${image.id}`);

      return ["landscape", "travel"];
    }
  }
});

const result = await tags.tagImage({
  id: "a",
  src: "/images/a.jpg"
});

console.log(result.tags);
```

## Common APIs

- `WatermarkPlugin`: 文本或图片水印。
- `DownloadPlugin`: 单图和批量下载。
- `AiTagsPlugin`: provider 驱动的自动标签。
- `AiSearchPlugin`: provider 驱动的特征提取和相似搜索。
- `calculateSimilarity`: 向量相似度计算工具。

## Notes

- 插件都使用命名导出。
- AI 插件只定义 provider 接口和缓存逻辑，不绑定具体云服务。
- 插件可以通过 `Gallery.use(plugin)` 安装，也可以在测试中直接对插件实例调用方法。
