const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const distDir = path.join(rootDir, "dist")

if (!fs.existsSync(distDir)) {
  process.exit(0)
}

const entries = fs.readdirSync(distDir, { withFileTypes: true })

for (const entry of entries) {
  const entryPath = path.join(distDir, entry.name)
  const isExe = entry.isFile() && path.extname(entry.name).toLowerCase() === ".exe"

  if (!isExe) {
    fs.rmSync(entryPath, { recursive: true, force: true })
  }
}

