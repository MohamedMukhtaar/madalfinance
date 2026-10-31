import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("src/services/finance");

for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "helpers.ts" && x !== "index.ts")) {
  const file = path.join(dir, f);
  let s = fs.readFileSync(file, "utf8");

  s = s.replace(/import \{([^}]+)\} from "\.\.\/api";/, (_m, inner) => {
    const names = inner.split(",").map((p) => p.trim()).filter(Boolean);
    const next = names.map((n) => (n === "authApi" ? "authApi as http" : n));
    return `import { ${next.join(", ")} } from "../api";`;
  });

  // Client calls only (not the export name)
  s = s.replace(/\bauthApi\.(get|post|put|patch|delete|upload)\b/g, "http.$1");

  fs.writeFileSync(file, s);
  console.log("fixed", f);
}
