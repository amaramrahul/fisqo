import { app, BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

let apiProcess: ChildProcess | undefined;
let launching = false;

function startApiServer(): void {
  apiProcess = spawn(
    "node",
    [path.resolve(__dirname, "../../api/dist/server.js")],
    {
      env: { ...process.env, PORT: String(PORT) },
      stdio: "inherit",
    }
  );
  apiProcess.on("error", (err) => {
    console.error("Failed to start Fisqo API server:", err);
    app.quit();
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(`http://localhost:${PORT}`);
}

function launchOrRestart(): void {
  if (launching) return;
  launching = true;
  try {
    startApiServer();
  } catch (err) {
    launching = false;
    throw err;
  }
  setTimeout(() => {
    try {
      createWindow();
    } finally {
      launching = false;
    }
  }, 1000);
}

app.whenReady().then(() => {
  launchOrRestart();
});

app.on("window-all-closed", () => {
  apiProcess?.kill();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  apiProcess?.kill();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    launchOrRestart();
  }
});

function shutdown(): void {
  apiProcess?.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
