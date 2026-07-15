import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createApp } from "./app.js";
import { prisma } from "./db.js";

const PORT = Number(process.env.PORT) || 3000;

const app = createApp(prisma);

const webDist = path.resolve(process.cwd(), "../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("/*splat", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Fisqo API listening on http://localhost:${PORT}`);
});
