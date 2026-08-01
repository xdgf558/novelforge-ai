const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const {
  ensureDesktopEnvExample,
  ensureSqliteDatabaseFile,
  failInterruptedAiTasks,
  readDesktopEnv,
  runDesktopMigrations,
  toPrismaSqliteUrl,
} = require("./runtime.cjs");

app.setName("NovelForge AI");

let mainWindow;
let nextProcess;
let shuttingDown = false;
let currentStartUrl;
let currentPaths;

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });

  app.whenReady().then(startDesktopApp).catch((error) => {
    showStartupError(error);
    app.quit();
  });
}

app.on("before-quit", () => {
  shuttingDown = true;
  stopNextServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && currentStartUrl && currentPaths) {
    createMainWindow(currentStartUrl, currentPaths);
  }
});

async function startDesktopApp() {
  const paths = getDesktopPaths();
  installApplicationMenu(paths);

  const externalStartUrl = process.env.ELECTRON_START_URL;
  const startUrl = externalStartUrl || (await startBundledNext(paths));
  currentStartUrl = startUrl;
  currentPaths = paths;

  createMainWindow(startUrl, paths);
}

function getDesktopPaths() {
  const appRoot = getRuntimeAppRoot();
  const dataRoot =
    process.env.NOVELFORGE_DESKTOP_DATA_DIR ||
    path.join(app.getPath("appData"), "NovelForge AI");
  const databasePath = path.join(dataRoot, "data", "novelforge-ai.sqlite");
  const envPath = path.join(dataRoot, ".env");

  ensureSqliteDatabaseFile(databasePath);
  ensureDesktopEnvExample(dataRoot);

  return {
    appRoot,
    dataRoot,
    databasePath,
    envPath,
  };
}

function getRuntimeAppRoot() {
  if (!app.isPackaged) {
    return app.getAppPath();
  }

  return path.join(process.resourcesPath, "app.asar.unpacked");
}

async function startBundledNext(paths) {
  const port = await findOpenPort(48312);
  const databaseUrl = toPrismaSqliteUrl(paths.databasePath);
  const desktopEnv = readDesktopEnv(paths.envPath);
  const serverEnv = {
    ...process.env,
    ...desktopEnv,
    DATABASE_URL: databaseUrl,
    NEXT_TELEMETRY_DISABLED: "1",
    NOVELFORGE_AI_CONFIG_PATH: paths.envPath,
    NOVELFORGE_DESKTOP: "1",
    NOVELFORGE_DESKTOP_DATA_DIR: paths.dataRoot,
    NODE_ENV: "production",
    PORT: String(port),
  };

  await runDesktopMigrations(paths.appRoot, databaseUrl);

  try {
    await failInterruptedAiTasks(paths.appRoot, databaseUrl);
  } catch (error) {
    console.error("Failed to clean up interrupted AI tasks:", error);
  }

  const nextBin = require.resolve("next/dist/bin/next", {
    paths: [paths.appRoot],
  });
  nextProcess = runElectronNode(
    nextBin,
    ["start", "-H", "127.0.0.1", "-p", String(port)],
    paths.appRoot,
    serverEnv,
  );
  nextProcess.stdout.on("data", (chunk) => {
    console.log(chunk.toString().trim());
  });
  nextProcess.stderr.on("data", (chunk) => {
    console.error(chunk.toString().trim());
  });

  nextProcess.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      showStartupError(
        new Error(`Local NovelForge server exited unexpectedly with code ${code}.`),
      );
      app.quit();
    }
  });

  const startUrl = `http://127.0.0.1:${port}`;
  await waitForServer(startUrl);

  return startUrl;
}

function runElectronNode(scriptPath, args, cwd, env) {
  return spawn(process.execPath, [scriptPath, ...args], {
    cwd,
    env: {
      ...env,
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function createMainWindow(startUrl, paths) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1040,
    minHeight: 720,
    title: "NovelForge AI",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isLocalAppUrl(url, startUrl)) {
      return { action: "allow" };
    }

    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isLocalAppUrl(url, startUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "Escape") {
      if (exitExpandedWindow(mainWindow)) {
        event.preventDefault();
      }
    }
  });

  mainWindow.loadURL(startUrl).catch((error) => {
    showStartupError(error);
    app.quit();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-fail-load", (_event, _code, description) => {
    showStartupError(new Error(description));
  });

  mainWindow.paths = paths;
}

function exitExpandedWindow(browserWindow) {
  if (!browserWindow) {
    return false;
  }

  if (browserWindow.isFullScreen()) {
    browserWindow.setFullScreen(false);
    return true;
  }

  if (
    typeof browserWindow.isSimpleFullScreen === "function" &&
    browserWindow.isSimpleFullScreen()
  ) {
    browserWindow.setSimpleFullScreen(false);
    return true;
  }

  if (browserWindow.isMaximized()) {
    browserWindow.unmaximize();
    return true;
  }

  return false;
}

function installApplicationMenu(paths) {
  const template = [
    {
      label: "NovelForge AI",
      submenu: [
        {
          label: "打开数据目录",
          click: () => {
            shell.openPath(paths.dataRoot);
          },
        },
        { type: "separator" },
        { role: "quit", label: "退出 NovelForge AI" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新载入" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function stopNextServer() {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
  }
}

function findOpenPort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolve(findOpenPort(startPort + 1));
      } else {
        reject(error);
      }
    });

    server.once("listening", () => {
      const address = server.address();
      server.close(() => {
        resolve(address.port);
      });
    });

    server.listen(startPort, "127.0.0.1");
  });
}

function waitForServer(url) {
  const startedAt = Date.now();
  const timeoutMs = 45000;
  let lastFailure = "no response yet";

  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode < 500) {
          resolve();
        } else {
          lastFailure = `HTTP ${response.statusCode || "unknown"}`;
          retry();
        }
      });

      request.on("error", (error) => {
        lastFailure = error.message;
        retry();
      });
      request.setTimeout(1500, () => {
        lastFailure = "request timed out";
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(
          new Error(
            `Timed out while starting the local NovelForge server. Last check: ${lastFailure}.`,
          ),
        );
        return;
      }

      setTimeout(poll, 500);
    };

    poll();
  });
}

function isLocalAppUrl(url, startUrl) {
  try {
    return new URL(url).origin === new URL(startUrl).origin;
  } catch {
    return false;
  }
}

function showStartupError(error) {
  dialog.showErrorBox(
    "NovelForge AI 启动失败",
    error instanceof Error ? error.message : String(error),
  );
}
