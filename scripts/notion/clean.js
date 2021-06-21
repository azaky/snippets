const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");

try {
  fs.rmSync(path.join(root, "_posts"), { recursive: true, force: true });
} catch (e) {
  console.warn(e);
}

try {
  fs.rmSync(path.join(root, "_tags"), { recursive: true, force: true });
} catch (e) {
  console.warn(e);
}

try {
  fs.rmSync(path.join(root, "manifest.json"));
} catch (e) {
  console.warn(e);
}

try {
  fs.rmSync(path.join(root, "COMMIT_MESSAGE"));
} catch (e) {
  console.warn(e);
}
