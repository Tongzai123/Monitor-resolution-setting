# Electron Packaging Guidelines

> Runtime packaging contracts for this Electron + React project.

---

## Scenario: Native Dependency Runtime Contract

### 1. Scope / Trigger

This applies whenever the packaged Electron app includes a local or native Node
dependency, especially dependencies declared with `file:src/modules/...`.

The failure mode that triggered this rule was:

```text
A JavaScript error occurred in the main process
Cannot find module ...\node_modules\@paymoapp\active-window\dist\index.js
Please verify that the package.json has a valid "main" entry
```

Root cause: `@paymoapp/active-window/package.json` declared
`"main": "./dist/index.js"`, but the package build only ran
`node-gyp rebuild`. The native `.node` binary existed, while the JavaScript
entry under `dist/` was missing from the installed app.

### 2. Signatures

Relevant package scripts must satisfy the full runtime contract:

```json
{
  "main": "./dist/index.js",
  "scripts": {
    "postinstall": "npm run build",
    "build": "npm run build:ts && npm run build:gyp",
    "build:ts": "tsc --project tsconfig.build.json",
    "build:gyp": "node-gyp rebuild"
  }
}
```

If `main` points to generated JavaScript, the package `build` script must
generate that JavaScript before Electron Builder packages the app.

### 3. Contracts

- `package.json.main` must resolve at runtime from the installed application.
- The JavaScript entry named by `main` must exist after packaging.
- Any native `.node` binary required by that JavaScript entry must exist under
  `resources/app.asar.unpacked`.
- `dist/win-unpacked` success is not enough. The NSIS installer must be
  installed and the installed exe must launch successfully from
  `AppData\Local\Programs\...`.
- When the source workspace path contains non-ASCII characters and native
  rebuilds are unstable, package from an ASCII build workspace and record that
  path in the verification notes.

### 4. Validation & Error Matrix

| Condition | Expected action |
| --- | --- |
| `package.json.main` points to `dist/*.js` | Run the TypeScript/JavaScript build before `node-gyp rebuild` |
| Native `.node` exists but JS entry is missing | Treat packaging as failed; do not ship the installer |
| `dist/win-unpacked` launches but installed exe fails | Treat installer verification as failed; debug installed resources |
| Error says `Cannot find module ...\dist\index.js` | Inspect the dependency `package.json.main`, not only the app root `main` |
| Error says `Cannot find module ...\app.asar\..\index.js` | Verify root `package.json.main` and any early `app.getAppPath()` / package reads |
| Native rebuild fails only under a non-ASCII workspace path | Use an ASCII build workspace and document the limitation |

### 5. Good / Base / Bad Cases

Good:

```text
npm run build:ts --prefix src/modules/node-active-window
npm run parcel-build
npm run electron-build
install generated NSIS exe
launch installed Twinkle Tray.exe
```

Base:

```text
npm run electron-build
check dist/win-unpacked
```

This is useful but incomplete because it does not prove the installer lays down
all runtime files correctly.

Bad:

```json
{
  "main": "./dist/index.js",
  "scripts": {
    "build": "npm run build:gyp"
  }
}
```

This can compile the native addon while still shipping no JavaScript entry.

### 6. Tests Required

For every Electron installer build:

- Run `npm run parcel-build`.
- Run `npm run electron-build`.
- Check the installer exists under `dist/*.exe`.
- Install the generated `.exe`.
- Check the installed dependency files that the startup path requires. For
  `@paymoapp/active-window`, assert:
  - `resources/app.asar.unpacked\node_modules\@paymoapp\active-window\dist\index.js`
  - `resources/app.asar.unpacked\node_modules\@paymoapp\active-window\build\Release\PaymoActiveWindow.node`
- Launch the installed exe and verify no `A JavaScript error occurred in the
  main process` dialog appears.
- Record installer path, size, SHA256, install result, and launch result in the
  task verification file.

### 7. Wrong vs Correct

#### Wrong

Only checking that Electron Builder completed and that a `.node` file exists:

```text
electron-builder succeeded
PaymoActiveWindow.node exists
ship installer
```

#### Correct

Check both halves of the dependency runtime contract and the installed app:

```text
dependency package.json.main resolves
generated JS entry exists
native .node exists
installer installs both files
installed exe launches without a main-process error
```

---

## Common Mistake: Misreading Electron Main-Process Module Errors

**Symptom**: Electron shows `Please verify that the package.json has a valid
"main" entry`.

**Cause**: The message can refer to a dependency package's `main`, not only the
root application `package.json.main`.

**Fix**:

1. Read the full missing module path in the error dialog.
2. Identify whether the path is under the app root or under
   `node_modules/<package>`.
3. If it is under a dependency, inspect that dependency's `package.json.main`
   and verify the target file is packaged.

**Prevention**: Installer verification must include installed-resource checks
for every local/native dependency loaded during app startup.

