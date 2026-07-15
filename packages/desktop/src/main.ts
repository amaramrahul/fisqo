import { app, BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

let apiProcess: ChildProcess | undefined;

function startApiServer(): void {
  apiProcess = spawn(
    "node",
    [path.resolve(__dirname, "../../api/dist/server.js")],
    {
      env: { ...process.env, PORT: String(PORT) },
      stdio: "inherit",
    }
  );
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

app.whenReady().then(() => {
  startApiServer();
  setTimeout(createWindow, 1000);
});

app.on("window-all-closed", () => {
  apiProcess?.kill();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
