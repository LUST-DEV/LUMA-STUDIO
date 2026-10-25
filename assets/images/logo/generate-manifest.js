const fs = require("fs");
const path = require("path");

const folder = __dirname;
const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);
const files = fs.readdirSync(folder)
  .filter((file) => allowed.has(path.extname(file).toLowerCase()))
  .filter((file) => !file.toLowerCase().endsWith(".bak") && !file.toLowerCase().endsWith(".tmp"))
  .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

const entries = files.map((file) => {
  const base = path.basename(file, path.extname(file));
  const label = base
    .replace(/[-_]+/g, " ")
    .replace(/\b([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return {
    id: base.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: label || "Logo",
    src: `assets/images/logo/${file}`
  };
});

fs.writeFileSync(path.join(folder, "manifest.json"), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Generated ${entries.length} logo entries in ${path.join(folder, "manifest.json")}`);
