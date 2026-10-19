// Benchmarks mpv time-to-first-frame on a real HLS master, per option set.
//
// mpv is libavformat + libavcodec, i.e. the exact runtime the app uses, so
// `mpv --frames=1` reproduces what the player pays before the first frame.
// ffmpeg CLI cannot express `demuxer-lavf-probe-info` (there is no
// `-probe_info` option), so it must not be used to answer this question.
//
//   node tools/mpv_startup_bench.mjs <master.m3u8> [referer] [runs]
import { spawn } from "node:child_process";

const master = process.argv[2];
const referer = process.argv[3] || "https://www.xnxx.com/";
const runs = Number(process.argv[4] || 5);
if (!master) {
  console.error("usage: node tools/mpv_startup_bench.mjs <master.m3u8> [referer] [runs]");
  process.exit(2);
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// The exact properties the app sets, in the same spirit: cap the analysis,
// optionally skip the probe, and pick a rendition via hls-bitrate.
const MODES = [
  { label: "default", args: [] },
  { label: "app: nostreams + analyze=1", args: ["--demuxer-lavf-probe-info=nostreams", "--demuxer-lavf-analyzeduration=1"] },
  { label: "nostreams only", args: ["--demuxer-lavf-probe-info=nostreams"] },
  { label: "analyze=1 only", args: ["--demuxer-lavf-analyzeduration=1"] },
  { label: "nostreams + hls-bitrate=815104", args: ["--demuxer-lavf-probe-info=nostreams", "--hls-bitrate=815104"] },
  { label: "default + hls-bitrate=815104", args: ["--hls-bitrate=815104"] },
];

function runOnce(args) {
  return new Promise((resolve) => {
    const sw = Date.now();
    const p = spawn("mpv", [
      "--no-config",
      "--no-terminal",
      "--vo=null",
      "--ao=null",
      "--frames=1",
      `--user-agent=${UA}`,
      `--referrer=${referer}`,
      ...args,
      master,
    ]);
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      resolve({ ms: Date.now() - sw, code, err });
    });
  });
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

for (const mode of MODES) {
  const results = [];
  for (let i = 0; i < runs; i++) results.push(await runOnce(mode.args));
  const times = results.map((r) => r.ms);
  const codes = [...new Set(results.map((r) => r.code))];
  const anyError = results.some((r) => /error|fail|No video|Could not/i.test(r.err));
  console.log(
    `${mode.label.padEnd(34)} median=${String(median(times)).padStart(6)}ms  ` +
      `min=${Math.min(...times)}ms  rc=[${codes}]  errors=${anyError}  ` +
      `runs=[${times.join(", ")}]`,
  );
}
