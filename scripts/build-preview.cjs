const fs = require("node:fs");
fs.mkdirSync("dist", { recursive: true });
for (const file of [
  "explore-v2.html",
  "explore-data.js",
  "explore-core.js",
  "explore-app.js",
  "explore.css",
])
  fs.copyFileSync(
    file,
    "dist/" + (file === "explore-v2.html" ? "index.html" : file),
  );
fs.writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
console.log("Preview built in dist/. Production index.html is unchanged.");
