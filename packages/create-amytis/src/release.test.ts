import { describe, test, expect, afterAll } from "bun:test";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";
import type { AddressInfo } from "net";
import { downloadFile, fetchJson } from "./release";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-amytis-release-"));
afterAll(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

// A server that promises 1000 bytes, sends fewer, then drops the connection.
// What it sends is complete JSON, so a client that took the drop for a normal
// end would succeed, and the tests would catch it, rather than fail to parse.
function brokenServer(): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Length": "1000", "Content-Type": "application/json" });
    res.write('{"tag_name": "v2.0.2"}');
    setTimeout(() => res.socket?.destroy(), 20);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://127.0.0.1:${port}/`, close: () => server.close() });
    });
  });
}

describe("a connection that breaks off", () => {
  test("fails the download and removes the partial file", async () => {
    const server = await brokenServer();
    const dest = path.join(tmpDir, "archive.tar.gz");
    try {
      await expect(downloadFile(server.url, dest)).rejects.toThrow();
      expect(fs.existsSync(dest)).toBe(false);
    } finally {
      server.close();
    }
  });

  test("fails the release lookup", async () => {
    const server = await brokenServer();
    try {
      await expect(fetchJson(server.url)).rejects.toThrow();
    } finally {
      server.close();
    }
  });
});
