# ZabbLeaf

ZabbLeaf is a standalone native desktop application for offline LaTeX editing and bidirectional Overleaf synchronization.

Developed by Diletta Abbonato (Zabbonat).

## Download Desktop App (Windows, macOS, Linux)

No Node.js, terminal commands, or developer tools are required to use ZabbLeaf. Download the pre-compiled installer for your operating system directly from GitHub Releases:

- **Windows**: [Download ZabbLeaf for Windows (.msi / .exe)](https://github.com/zabbonat/ZabbLeaf/releases/latest)
- **macOS**: [Download ZabbLeaf for macOS (.dmg)](https://github.com/zabbonat/ZabbLeaf/releases/latest)
- **Linux**: [Download ZabbLeaf for Linux (.AppImage / .deb)](https://github.com/zabbonat/ZabbLeaf/releases/latest)

[View All Release Files and Versions](https://github.com/zabbonat/ZabbLeaf/releases)

---

## Description

ZabbLeaf runs as a native desktop program on Windows, macOS, and Linux.

While offline, documents are edited locally with a side-by-side PDF preview using an embedded WebAssembly LaTeX compiler. When internet access is available, changes are synchronized directly with your Overleaf project.

## Key Features

- Cross-platform native desktop application (Windows, macOS, Linux).
- Offline LaTeX editor powered by Monaco Editor.
- Built-in WebAssembly LaTeX compiler for real PDF previews without TeX Live.
- Project manager to view all your Overleaf projects in a single grid.
- Local version history to track offline changes and restore previous versions.
- Seamless "one-click" login via your default web browser (supports Google SSO and ORCID).

---

## Using ZabbLeaf

1. Launch the ZabbLeaf desktop application.
2. Click **Login with Overleaf** on the home screen.
3. Your default web browser will open. Log into Overleaf using your preferred method (Email, Google, or ORCID).
4. ZabbLeaf will automatically connect and display a list of all your Overleaf projects.
5. Click on a project to open the editor and start working offline!
6. Click **Recompile** to generate a PDF preview, and **Sync Overleaf** when you are back online to push changes.

---

## Compiling from Source Code (Developers Only)

If you want to modify the source code or build ZabbLeaf manually, Node.js (v18+) and Rust are required.

```bash
git clone https://github.com/zabbonat/ZabbLeaf.git
cd ZabbLeaf
npm install
npm run tauri build
```

## License

MIT License. See LICENSE for details.
