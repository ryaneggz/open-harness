const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const express = require("express");
const { z } = require("zod");
const { exec, execSync } = require("child_process");
const crypto = require("crypto");

// Resolve clawdius user UID/GID at startup
const EXEC_UID = parseInt(execSync("id -u clawdius").toString().trim(), 10);
const EXEC_GID = parseInt(execSync("id -g clawdius").toString().trim(), 10);

const API_KEY = process.env.API_KEY || "";

function log(level, msg, meta = {}) {
  const entry = {
    time: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}

// Auth middleware
function authMiddleware(req, res, next) {
  if (API_KEY && req.headers["x-api-key"] !== API_KEY) {
    log("warn", "Auth rejected", { ip: req.ip });
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    log("info", "request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      session: req.headers["mcp-session-id"] || null,
    });
  });
  next();
}

// Factory for the exec_command tool handler
function execCommandHandler({ cmd }) {
  log("info", "exec_command called", { cmd });
  return new Promise((resolve) => {
    exec(cmd, { timeout: 120000, maxBuffer: 1024 * 1024 * 10, cwd: "/home/clawdius", uid: EXEC_UID, gid: EXEC_GID, env: { HOME: "/home/clawdius", PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", TERM: "xterm" } }, (error, stdout, stderr) => {
      const output = [];
      if (stdout) output.push(`stdout:\n${stdout}`);
      if (stderr) output.push(`stderr:\n${stderr}`);
      if (error && !stderr) output.push(`error: ${error.message}`);
      if (error) output.push(`exit_code: ${error.code ?? 1}`);
      log(error ? "error" : "info", "exec_command result", {
        cmd,
        exitCode: error?.code ?? 0,
        stdoutLen: stdout?.length || 0,
        stderrLen: stderr?.length || 0,
      });
      resolve({
        content: [{ type: "text", text: output.join("\n") || "(no output)" }],
      });
    });
  });
}

const TOOL_SCHEMA = { cmd: z.string().describe("The shell command to execute") };

function registerTools(server) {
  server.tool("exec_command", "Execute a shell command and return stdout/stderr", TOOL_SCHEMA, execCommandHandler);
}

// Create top-level server (unused directly but kept for reference)
const server = new McpServer({ name: "exec-server", version: "1.0.0" });
registerTools(server);

const app = express();

app.use(requestLogger);
app.use("/mcp", express.json());
app.use("/mcp", authMiddleware);

// Transport map for session management
const transports = new Map();

app.post("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];
    const rpcMethod = req.body?.method;

    if (sessionId && transports.has(sessionId)) {
      log("info", "Existing session request", { session: sessionId, rpcMethod });
      const transport = transports.get(sessionId);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // New session
    log("info", "Creating new session", { rpcMethod });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        log("info", "Session closed", { session: transport.sessionId });
        transports.delete(transport.sessionId);
        log("info", "Active sessions", { count: transports.size });
      }
    };

    const serverInstance = new McpServer({ name: "exec-server", version: "1.0.0" });
    registerTools(serverInstance);

    await serverInstance.connect(transport);
    await transport.handleRequest(req, res, req.body);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
      log("info", "Session created", { session: transport.sessionId });
      log("info", "Active sessions", { count: transports.size });
    }
  } catch (err) {
    log("error", "MCP error", { error: err.message, stack: err.stack });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    log("warn", "GET with invalid session", { session: sessionId });
    return res.status(400).json({ error: "Invalid or missing session ID" });
  }
  const transport = transports.get(sessionId);
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports.has(sessionId)) {
    log("warn", "DELETE with invalid session", { session: sessionId });
    return res.status(400).json({ error: "Invalid or missing session ID" });
  }
  log("info", "Session delete requested", { session: sessionId });
  const transport = transports.get(sessionId);
  await transport.handleRequest(req, res);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", sessions: transports.size });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  log("info", "Server started", { port: PORT, auth: !!API_KEY });
});
