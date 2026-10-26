import "./restore-pilot.mjs";
import fs from "node:fs";
import * as esbuild from "esbuild";
fs.mkdirSync("dist", { recursive: true });
const fonts = [400, 500, 600]
  .map(
    (w) =>
      `@font-face{font-family:Plex;font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/ttf;base64,${fs.readFileSync("vendor/fonts/IBM-Plex-Sans-Arabic-" + w + ".ttf").toString("base64")}) format('truetype')}`,
  )
  .join("");
const out = await esbuild.build({
  entryPoints: ["lab/src/app.js"],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2022",
  legalComments: "inline",
});
let html = fs
  .readFileSync("lab/src/shell.html", "utf8")
  .replace(
    "/* STYLES */",
    () => fonts + fs.readFileSync("lab/src/style.css", "utf8"),
  )
  .replace("/* APP */", () =>
    out.outputFiles[0].text.replaceAll("</script", "<\\/script"),
  );
const notices = [
  "vendor/three/LICENSE",
  "vendor/body-model/LICENSE",
  "vendor/fonts/OFL.txt",
]
  .map((p) => fs.readFileSync(p, "utf8"))
  .join("\n");
html = html.replace(
  "</body>",
  () =>
    `<!-- THIRD PARTY NOTICES\n${notices.replaceAll("--", "—")}\n--></body>`,
);
fs.writeFileSync("dist/maka-realism-lab.html", html);
console.log(
  "Built realism lab offline:",
  (html.length / 1024 / 1024).toFixed(2),
  "MB",
);
