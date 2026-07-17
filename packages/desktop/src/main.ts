import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron';

const PORT = 3000;
const APP_URL = `http://127.0.0.1:${PORT}`;
const HERE = path.dirname(fileURLToPath(import.meta.url));

let apiProcess: ChildProcess | null = null;

function startApi(): void {
  const apiEntry = path.resolve(HERE, '../../api/dist/server.js');
  const webDist = path.resolve(HERE, '../../web/dist');

  apiProcess = spawn(process.execPath, [apiEntry], {
    env: {
      ...process.env,
      PORT: String(PORT),
      WEB_DIST: webDist,
      DATABASE_URL: `file:${path.join(app.getPath('userData'), 'fisqo.db')}`,
      // Electron sets this for its own child processes; the API is plain Node.
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  });
}

async function waitForApi(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${APP_URL}/api/v1/tax-users`);
      if (response.ok) return;
    } catch {
      // The server is not accepting connections yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`The Fisqo API did not start within ${timeoutMs}ms`);
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Fisqo',
    webPreferences: {
      // Mandated by the tech design's security section. The preload bridge that
      // W1 Stage 3's file picker will need is a property of this window, which
      // is why the SPA is rendered here rather than in an external browser.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void window.loadURL(APP_URL);
}

app.whenReady().then(async () => {
  startApi();
  await waitForApi();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error: unknown) => {
  console.error('Fisqo failed to start:', error);
  apiProcess?.kill();
  app.quit();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('quit', () => {
  apiProcess?.kill();
});
