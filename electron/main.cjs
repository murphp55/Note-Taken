const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const express = require("express");
const path = require("path");
const http = require("http");

const WEB_PORT = 19006;
const DIST_DIR = path.join(__dirname, "../dist");

let apiProcess = null;

function startApiServer() {
  apiProcess = spawn("npx", ["tsx", "api/server.ts"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env },
    shell: true
  });
  apiProcess.stdout.on("data", (d) => console.log("[api]", d.toString().trim()));
  apiProcess.stderr.on("data", (d) => console.error("[api]", d.toString().trim()));
}

function startWebServer() {
  return new Promise((resolve) => {
    const webApp = express();
    webApp.use(express.static(DIST_DIR));
    webApp.get("*", (_req, res) => {
      res.sendFile(path.join(DIST_DIR, "index.html"));
    });
    http.createServer(webApp).listen(WEB_PORT, resolve);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadURL(`http://localhost:${WEB_PORT}`);
}

app.whenReady().then(async () => {
  startApiServer();
  await startWebServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (apiProcess) apiProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
