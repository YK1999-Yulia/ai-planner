import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Лад",
    short_name: "Лад",
    description: "Поділись думками — Лад розбере їх на задачі і складе план дня",
    start_url: "/",
    display: "standalone",
    background_color: "#1b1b1b",
    theme_color: "#1b1b1b",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
