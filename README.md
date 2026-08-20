# ZabbLeaf

ZabbLeaf is a standalone native desktop application for offline LaTeX editing and bidirectional Overleaf synchronization.

Developed by Diletta Abbonato (Zabbonat).

## Download

No Node.js, terminal commands, or developer tools are required. Each release has **one file per system** — download the one that matches yours from [the latest release](https://github.com/zabbonat/ZabbLeaf/releases/latest):

| System | File |
| --- | --- |
| Windows | `ZabbLeaf_windows_installer.exe` |
| macOS | `ZabbLeaf_mac_installer.dmg` |
| Linux | `ZabbLeaf_linux_installer.AppImage` |

[View all releases](https://github.com/zabbonat/ZabbLeaf/releases)

---

## Description

ZabbLeaf runs as a native desktop program on Windows, macOS, and Linux.

Projects are cloned over Overleaf's Git interface and edited locally, with a side-by-side preview. When internet access is available, changes are synchronized back to your Overleaf project.

## Key Features

- Cross-platform native desktop application (Windows, macOS, Linux).
- Offline LaTeX editor powered by Monaco Editor.
- Clones and syncs Overleaf projects over Git, using a Git token from your Overleaf account.
- Real offline PDF compilation with a local TeX engine — **optional**, see below.
- Project manager to view all your tracked projects in a single grid.
- Local version history to track offline changes and restore previous versions.

---

## Do I need to install LaTeX?

**No — ZabbLeaf works without it.** Installing a TeX engine is an optional step, and you decide whether to take it. Choose whichever fits:

| What you want | What you need |
| --- | --- |
| Edit offline, sync with Overleaf | Nothing extra |
| A rough text preview of the document | Nothing extra (**Quick Text Preview**) |
| Let Overleaf produce the PDF | Nothing extra (**Push to Overleaf & open**) |
| Real PDFs, fully offline | A local TeX engine (~142 MB) |

### Installing a TeX engine

You are offered the choice **the first time you open ZabbLeaf**: if no engine is found, the home screen asks whether to install one. Say no and it will not ask again — the option stays available in the compiler menu.

The choice works the same way on all three downloads. It lives in the app rather than in the installer because a `.dmg` and an `.AppImage` have no installer screens of their own — and because it stays available later, if you change your mind after installing.

To do it yourself instead:

- **Windows** — run `scripts/install-latex.ps1`, or install [MiKTeX](https://miktex.org/download).
- **macOS** — `brew install --cask basictex`, or [BasicTeX](https://tug.org/mactex/morepackages.html).
- **Linux** — `sudo apt install texlive-latex-recommended texlive-fonts-recommended` (or your distribution's equivalent).

If you install MiKTeX by hand, two settings save trouble later. ZabbLeaf's installer and the script apply them for you:

```powershell
initexmf --set-config-value "[MPM]AutoInstall=1"   # fetch missing packages without a dialog per package
mpm --install=cm-super                             # scalable fonts, needed by \usepackage[T1]{fontenc}
```

---

## Using ZabbLeaf

1. Launch the ZabbLeaf desktop application.
2. Generate a Git token in Overleaf: **Account Settings → Git Integration → Generate token**.
3. Click **Login with Overleaf** and paste your email and that token.
4. Click **Add Overleaf Project** and paste the project URL. ZabbLeaf clones it into `~/.zabbleaf/projects/`.
5. Edit offline. Changes are saved to disk as you type.
6. Pick a compiler and click **Recompile**; click **Sync Overleaf** to push your changes back.

> Overleaf's Git integration requires a paid Overleaf plan on some account types. Your token is stored locally and is only sent to `git.overleaf.com`.

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
