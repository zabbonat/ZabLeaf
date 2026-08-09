# ZabbLeaf

ZabbLeaf is a standalone native desktop application for offline LaTeX editing and bidirectional Overleaf synchronization.

Developed by Diletta Abbonato (Zabbonat).

## Download Desktop App (Windows, macOS, Linux)

No Node.js, terminal commands, or developer tools are required to use ZabbLeaf. Download the pre-compiled installer for your operating system directly from GitHub Releases:

- **Windows**: [Download ZabbLeaf for Windows (.msi / .exe)](https://github.com/zabbonat/ZabLeaf/releases/latest)
- **macOS**: [Download ZabbLeaf for macOS (.dmg)](https://github.com/zabbonat/ZabLeaf/releases/latest)
- **Linux**: [Download ZabbLeaf for Linux (.AppImage / .deb)](https://github.com/zabbonat/ZabLeaf/releases/latest)

[View All Release Files and Versions](https://github.com/zabbonat/ZabLeaf/releases)

---

## Description

ZabbLeaf runs as a native desktop program on Windows, macOS, and Linux.

While offline, documents are edited locally with a side-by-side PDF preview. When internet access is available, changes are synchronized directly with your Overleaf project using Overleaf's Git integration.

## Key Features

- Cross-platform native desktop application (Windows, macOS, Linux).
- Offline LaTeX editor powered by Monaco Editor.
- Side-by-side PDF preview.
- Bidirectional synchronization with specific Overleaf projects via Git.
- Local offline storage for files and project settings.
- Interactive multi-file creation and local directory chooser.
- Compatible with standard Overleaf accounts, Google SSO, and ORCID login.

---

## How to Connect Your Overleaf Project

To synchronize a project between ZabbLeaf and Overleaf, you need two items from Overleaf:

### 1. Overleaf Project ID
- Open your project on [Overleaf.com](https://www.overleaf.com).
- Check the address bar in your web browser:
  `https://www.overleaf.com/project/65e8a9f012b34c56789abcde`
- The **Project ID** is the string of characters after `/project/` (example: `65e8a9f012b34c56789abcde`).

### 2. Overleaf Git Password / Access Token
- Log into Overleaf.
- Click your profile icon in the top-right corner and select **Account Settings**.
- Scroll down to the **Git Integration** section.
- Click **Set Git Password** or **Create Token**.
- Copy the generated Git password/token.

*(Note: Users logging into Overleaf via Google SSO or ORCID use their Overleaf email address and this generated Git Password).*

---

## Using ZabbLeaf

1. Launch the ZabbLeaf desktop application.
2. Click **Account Settings**.
3. Enter your Overleaf Email, Git Token, and Project ID.
4. Click **Save & Connect**.
5. Click **Sync Overleaf** to fetch or push changes.

---

## Compiling from Source Code (Developers Only)

If you want to modify the source code or build ZabbLeaf manually, Node.js (v18+) and Rust are required.

```bash
git clone https://github.com/zabbonat/ZabLeaf.git
cd ZabLeaf
npm install
npm run tauri build
```

## License

MIT License. See LICENSE for details.
