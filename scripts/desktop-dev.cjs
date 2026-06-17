const http = require("node:http");
const { spawn } = require("node:child_process");
const electronPath = require("electron");

const port = process.env.PORT || "3000";
const startUrl = `http://127.0.0.1:${port}`;
let shuttingDown = false;

const nextProcess = spawn(
  "npm",
  ["run", "dev", "--", "-H", "127.0.0.1", "-p", port],
  {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: "inherit",
  },
);

nextProcess.on("exit", (code) => {
  if (!shuttingDown && code !== 0) {
    process.exit(code || 1);
  }
});

waitForServer(startUrl)
  .then(() => {
    const electronProcess = spawn(electronPath, ["."], {
      env: {
        ...process.env,
        ELECTRON_START_URL: startUrl,
      },
      stdio: "inherit",
    });

    electronProcess.on("exit", (code) => {
      shuttingDown = true;
      nextProcess.kill();
      process.exit(code || 0);
    });
  })
  .catch((error) => {
    shuttingDown = true;
    nextProcess.kill();
    console.error(error);
    process.exit(1);
  });

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

function stop() {
  shuttingDown = true;
  nextProcess.kill();
  process.exit(0);
}

function waitForServer(url) {
  const startedAt = Date.now();
  const timeoutMs = 45000;

  return new Promise((resolve, reject) => {
    const poll = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });

      request.on("error", retry);
      request.setTimeout(1500, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}.`));
        return;
      }

      setTimeout(poll, 500);
    };

    poll();
  });
}
