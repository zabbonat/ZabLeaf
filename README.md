# ZabLeaf

ZabLeaf is a standalone, lightweight native desktop application for editing LaTeX documents offline and synchronizing specific projects with Overleaf via Git.

Developed by Diletta Abbonato (Zabbonat).

## Description

ZabLeaf is a pre-compiled native desktop application for Windows, macOS, and Linux built using Tauri and Rust. End users do not need to install Node.js, Rust, or any developer tools to use the application.

While offline, documents are edited locally with a side-by-side PDF preview. When internet access is available, changes are synchronized directly with your Overleaf project using Overleaf's Git integration.

## Key Features

- Direct standalone desktop executable (`.exe` / `.msi` for Windows). No Node.js required for end users.
- Offline LaTeX editor powered by Monaco Editor.
- Side-by-side PDF preview.
- Bidirectional synchronization with specific Overleaf projects via Git.
- Local offline storage for files and project settings.
- Compatible with Overleaf accounts, Google SSO, and ORCID authentication.

## How to Install (End Users)

1. Go to the [Releases](https://github.com/zabbonat/ZabLeaf/releases) section of this GitHub repository.
2. Download the latest installer file for Windows:
   - `ZabLeaf_1.0.0_x64_en-US.msi` (or `ZabLeaf.exe`)
3. Double-click the downloaded file to install and launch ZabLeaf on your computer.

---

## How to Get Required Credentials from Overleaf

To synchronize a project between ZabLeaf and Overleaf, you need two items from Overleaf:

### 1. Overleaf Project ID
- Open the project you want to sync on [Overleaf.com](https://www.overleaf.com).
- Look at the web browser URL in your address bar:
  `https://www.overleaf.com/project/65e8a9f012b34c56789abcde`
- The **Project ID** is the string of numbers and letters after `/project/` (for example: `65e8a9f012b34c56789abcde`).

### 2. Overleaf Git Password / Token
- Log into Overleaf.
- Click your profile icon in the top-right corner and select **Account Settings**.
- Scroll down to the **Git Integration** section.
- Click **Set Git Password** or **Create Token**.
- Copy the generated Git password/token.

*(Note: Users who log into Overleaf via Google SSO or ORCID use their Overleaf account email and this generated Git Password to authenticate).*

---

## Project Synchronization Setup in ZabLeaf

1. Launch ZabLeaf from your desktop or Start Menu.
2. Click **Account Settings**.
3. Enter:
   - **Overleaf Account Email**
   - **Git Password / Token** (obtained from Account Settings)
   - **Project ID** (obtained from project URL)
4. Click **Save & Connect**.
5. Click **Sync Overleaf** to fetch or push changes.

---

## Building from Source (Developers Only)

Developers who wish to compile ZabLeaf from source code require:
- Node.js (version 18 or higher)
- Rust toolchain

Steps:
```bash
git clone https://github.com/zabbonat/ZabLeaf.git
cd ZabLeaf
npm install
npm run tauri build
```

## License

MIT License. See LICENSE for details.
