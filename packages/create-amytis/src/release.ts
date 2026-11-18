// Finding, downloading and unpacking an Amytis release.

import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { execFileSync } from "child_process";
import { pipeline } from "stream/promises";

export const REPO = "hutusi/amytis";

// A connection that sends nothing for this long fails instead of hanging.
const IDLE_TIMEOUT_MS = 60_000;

// GET with the CLI's User-Agent and an idle timeout. GitHub is https; the
// tests use a local http server.
function get(url: string, onResponse: (res: http.IncomingMessage) => void): http.ClientRequest {
  const client = url.startsWith("http:") ? http : https;
  const req = client.get(url, { headers: { "User-Agent": "create-amytis-cli" } }, onResponse);
  req.setTimeout(IDLE_TIMEOUT_MS, () => req.destroy(new Error(`No response from ${url} for ${IDLE_TIMEOUT_MS / 1000}s`)));
  return req;
}

export function fetchJson(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        fetchJson(res.headers.location!).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        const hint = res.statusCode === 403 || res.statusCode === 429
          ? " (usually its hourly limit for requests without a token; try again later)"
          : "";
        reject(new Error(`GitHub API returned ${res.statusCode} for ${url}${hint}`));
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      // A connection that breaks off mid-body fails here, not on the request.
      res.on("error", reject);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data) as Record<string, unknown>);
        } catch {
          reject(new Error("Failed to parse GitHub API response"));
        }
      });
    }).on("error", reject);
  });
}

// Downloads url to dest. A download that fails part way removes the partial
// file, so nothing half-written is unpacked.
export function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doGet = (targetUrl: string) => {
      get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume();
          doGet(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }
        pipeline(res, fs.createWriteStream(dest)).then(resolve, (err: Error) => {
          fs.rmSync(dest, { force: true });
          reject(err);
        });
      }).on("error", reject);
    };
    doGet(url);
  });
}

// The tag that a /releases/latest redirect points at, e.g.
// https://github.com/hutusi/amytis/releases/tag/v2.0.1 gives "v2.0.1". Null
// for anything else, such as the /releases page a repo without releases
// redirects to. The tag ends up in a URL and a file name, so only plain tag
// characters pass.
export function tagFromReleaseUrl(location: string): string | null {
  const match = /\/releases\/tag\/([A-Za-z0-9._-]+)\/?$/.exec(location);
  return match && !match[1].startsWith(".") ? match[1] : null;
}

function fetchRedirect(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "create-amytis-cli" } }, (res) => {
        res.resume();
        const status = res.statusCode ?? 0;
        resolve(status >= 300 && status < 400 ? res.headers.location ?? null : null);
      })
      .on("error", reject);
  });
}

// github.com redirects /releases/latest to the latest release's tag page, so
// the tag can be read without the REST API. The API allows 60 requests an
// hour without a token, shared by everyone behind one IP address (an office,
// a school, a CI runner), so it is only the fallback.
export async function getLatestReleaseTag(): Promise<string> {
  try {
    const location = await fetchRedirect(`https://github.com/${REPO}/releases/latest`);
    const tag = location ? tagFromReleaseUrl(location) : null;
    if (tag) return tag;
  } catch {
    // Fall back to the API.
  }
  const release = await fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`);
  const tag = typeof release["tag_name"] === "string" ? tagFromReleaseUrl(`/releases/tag/${release["tag_name"]}`) : null;
  if (!tag) throw new Error("Could not determine latest release tag");
  return tag;
}

export function getArchiveMetadata(tag: string, platform: NodeJS.Platform = process.platform): {
  url: string;
  filename: string;
  kind: "zip" | "tar.gz";
} {
  if (platform === "win32") {
    return {
      url: `https://github.com/${REPO}/archive/refs/tags/${tag}.zip`,
      filename: `amytis-${tag}.zip`,
      kind: "zip",
    };
  }

  return {
    url: `https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`,
    filename: `amytis-${tag}.tar.gz`,
    kind: "tar.gz",
  };
}

export function buildExtractCommand(
  archivePath: string,
  tmpDir: string,
  kind: "zip" | "tar.gz",
  platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
  if (kind === "zip") {
    if (platform !== "win32") {
      throw new Error("ZIP extraction is only supported on Windows in create-amytis");
    }

    return {
      command: "powershell.exe",
      args: [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Expand-Archive",
        "-LiteralPath",
        archivePath,
        "-DestinationPath",
        tmpDir,
        "-Force",
      ],
    };
  }

  return {
    command: "tar",
    args: ["xzf", archivePath, "-C", tmpDir],
  };
}

// Downloads a release and unpacks it at outDir. The archive is downloaded
// next to outDir, and deleted once unpacked.
export async function downloadRelease(tag: string, outDir: string): Promise<string> {
  const archive = getArchiveMetadata(tag);
  const archivePath = path.join(path.dirname(outDir), archive.filename);
  try {
    await downloadFile(archive.url, archivePath);
  } catch (err) {
    throw new Error(`Couldn't download Amytis ${tag}: ${(err as Error).message}`);
  }
  extractArchive(archivePath, outDir, archive.kind);
  return outDir;
}

export function extractArchive(archivePath: string, outDir: string, kind: "zip" | "tar.gz", platform: NodeJS.Platform = process.platform): void {
  // Extract into a temp dir, then move the inner folder out
  const tmpDir = `${outDir}.__tmp__`;
  fs.mkdirSync(tmpDir, { recursive: true });
  const { command, args } = buildExtractCommand(archivePath, tmpDir, kind, platform);
  execFileSync(command, args, { stdio: "inherit" });

  // The tarball unpacks to a single top-level dir like "amytis-1.2.0/"
  const entries = fs.readdirSync(tmpDir);
  if (entries.length !== 1) {
    throw new Error(`Unexpected tarball structure: ${entries.join(", ")}`);
  }
  const innerDir = path.join(tmpDir, entries[0]);
  fs.renameSync(innerDir, outDir);
  fs.rmdirSync(tmpDir);
  fs.unlinkSync(archivePath);
}
