const childProcess = require("child_process")
const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const distDir = path.join(rootDir, "dist")
const winUnpackedDir = path.join(distDir, "win-unpacked")

function psQuote(value) {
  return `'${value.replace(/'/g, "''")}'`
}

function findPortableZips() {
  if (!fs.existsSync(distDir)) return []

  return fs.readdirSync(distDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && /-portable\.zip$/i.test(entry.name))
    .map(entry => path.join(distDir, entry.name))
}

function wrapPortableZip(zipPath) {
  const absoluteZipPath = path.resolve(zipPath)
  const zipName = path.basename(absoluteZipPath)
  const folderName = path.basename(zipName, ".zip")
  const stagingRoot = path.join(distDir, ".portable-wrap")
  const stagingFolder = path.join(stagingRoot, folderName)

  if (!fs.existsSync(winUnpackedDir)) {
    throw new Error(`Missing portable source directory: ${winUnpackedDir}`)
  }

  fs.rmSync(stagingRoot, { recursive: true, force: true })
  fs.mkdirSync(stagingRoot, { recursive: true })
  fs.cpSync(winUnpackedDir, stagingFolder, { recursive: true })
  fs.rmSync(absoluteZipPath, { force: true })

  childProcess.execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Compress-Archive -LiteralPath ${psQuote(stagingFolder)} -DestinationPath ${psQuote(absoluteZipPath)} -CompressionLevel Optimal -Force`
  ], { stdio: "inherit" })

  fs.rmSync(stagingRoot, { recursive: true, force: true })
  console.log(`Wrapped portable zip with root folder: ${absoluteZipPath}`)
}

const zipPaths = process.argv.slice(2).map(zipPath => path.resolve(zipPath))
const portableZips = zipPaths.length ? zipPaths : findPortableZips()

if (portableZips.length === 0) {
  throw new Error("No portable zip files found.")
}

for (const zipPath of portableZips) {
  wrapPortableZip(zipPath)
}
