const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { app, BrowserWindow } = require("electron");

const baseUrl = (
  process.env.NOVELFORGE_RESPONSIVE_BASE_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");
const screenshotDir = process.env.NOVELFORGE_RESPONSIVE_SCREENSHOT_DIR?.trim();
const cases = [
  {
    name: "manuscript-desktop",
    pathname: "/projects/phase4_demo/manuscript",
    width: 1280,
    height: 900,
    requiredText: ["成稿导出", "项目资料备份", "下载项目 JSON"],
  },
  {
    name: "manuscript-mobile",
    pathname: "/projects/phase4_demo/manuscript",
    width: 390,
    height: 844,
    requiredText: ["成稿导出", "项目资料备份", "下载项目 JSON"],
  },
  {
    name: "project-edit-desktop",
    pathname: "/projects/phase4_demo/edit",
    width: 1280,
    height: 900,
    requiredText: ["项目归档与删除", "前往本机设置创建备份", "永久删除"],
  },
  {
    name: "project-edit-mobile",
    pathname: "/projects/phase4_demo/edit",
    width: 390,
    height: 844,
    requiredText: ["项目归档与删除", "前往本机设置创建备份", "永久删除"],
  },
];

app.on("window-all-closed", () => {});
app.whenReady().then(run).catch(fail);

async function run() {
  if (screenshotDir) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await waitForServer(`${baseUrl}${cases[0].pathname}`);

  for (const testCase of cases) {
    await inspectCase(testCase);
  }

  console.log("Responsive layout smoke passed.");
  app.quit();
}

async function inspectCase(testCase) {
  const window = new BrowserWindow({
    show: false,
    width: testCase.width,
    height: testCase.height,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await loadPage(window, `${baseUrl}${testCase.pathname}`);
    const result = await window.webContents.executeJavaScript(`
      (() => {
        const interactive = Array.from(
          document.querySelectorAll("button, a, input, textarea, select")
        ).filter((element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" &&
            rect.width > 0 && rect.height > 0;
        });

        return {
          bodyText: document.body.innerText,
          clientWidth: document.documentElement.clientWidth,
          interactiveOverflow: interactive
            .filter((element) => element.scrollWidth > element.clientWidth + 1)
            .map((element) => (element.innerText || element.getAttribute("aria-label") || element.tagName).trim())
            .slice(0, 8),
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      })()
    `);

    assert.ok(
      Math.abs(result.viewportWidth - testCase.width) <= 16,
      `${testCase.name} uses the requested viewport width`,
    );
    assert.ok(
      result.scrollWidth <= result.clientWidth,
      `${testCase.name} has no horizontal page overflow`,
    );
    assert.deepEqual(
      result.interactiveOverflow,
      [],
      `${testCase.name} interactive labels fit their controls`,
    );

    for (const text of testCase.requiredText) {
      assert.ok(
        result.bodyText.includes(text),
        `${testCase.name} renders ${text}`,
      );
    }

    if (screenshotDir) {
      await window.webContents.executeJavaScript(
        "window.scrollTo(0, document.documentElement.scrollHeight)",
      );
      await new Promise((resolve) => setTimeout(resolve, 120));
      const image = await window.webContents.capturePage();

      fs.writeFileSync(
        path.join(screenshotDir, `${testCase.name}.png`),
        image.toPNG(),
      );
    }
  } finally {
    window.destroy();
  }
}

function fail(error) {
  console.error(error);
  process.exit(1);
}

async function loadPage(window, url) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await window.loadURL(url);
      return;
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await delay(attempt * 250);
      }
    }
  }

  throw new Error(`Unable to load ${url} after 3 attempts`, {
    cause: lastError,
  });
}

async function waitForServer(url) {
  let lastError;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await requestPage(url);
      return;
    } catch (error) {
      lastError = error;

      if (attempt < 20) {
        await delay(300);
      }
    }
  }

  throw new Error(`Responsive smoke server is not ready at ${url}`, {
    cause: lastError,
  });
}

function requestPage(url) {
  const client = url.startsWith("https:") ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.get(url, { timeout: 2_000 }, (response) => {
      response.resume();

      if (
        response.statusCode &&
        response.statusCode >= 200 &&
        response.statusCode < 500
      ) {
        resolve();
        return;
      }

      reject(new Error(`HTTP ${response.statusCode || "unknown"} for ${url}`));
    });

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error(`Timed out waiting for ${url}`));
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
