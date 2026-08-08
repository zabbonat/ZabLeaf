# ZabLeaf

ZabLeaf is a standalone, lightweight native desktop application for editing LaTeX documents offline and synchronizing specific projects with Overleaf via Git.

Developed by Diletta Abbonato (Zabbonat).

## Overview

ZabLeaf is not a web app; it is packaged as a native desktop program for Windows, macOS, and Linux using Tauri and Rust. It runs in its own window without requiring a web browser.

While offline, documents are edited locally with a side-by-side PDF preview. When internet access is available, changes are synchronized directly with your Overleaf project using Overleaf's Git integration.

## Key Features

- Native standalone desktop application (Windows `.msi`/`.exe`, macOS `.dmg`, Linux `.AppImage`).
- Offline LaTeX editor powered by Monaco Editor.
- Side-by-side PDF preview.
- Bidirectional synchronization with specific Overleaf projects via Git.
- Local offline storage for files and project settings.
- Compatible with Overleaf accounts, Google SSO, and ORCID authentication.

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

## How to Install and Build the Desktop Application

### Prerequisites

- Node.js (version 18 or higher)
- Rust and Cargo (required to build the native desktop installer)
- Git

### Build Steps for Desktop Executable

1. Clone the repository:
   ```bash
   git clone https://github.com/zabbonat/ZabLeaf.git
   cd ZabLeaf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in local development preview mode:
   ```bash
   npm run dev
   ```

4. Build the standalone desktop installer (`.msi` / `.exe` on Windows):
   ```bash
   npm run tauri build
   ```
   The compiled desktop installer will be generated in:
   `src-tauri/target/release/bundle/msi/`

## Project Synchronization Setup in ZabLeaf

1. Launch ZabLeaf.
2. Click **Account Settings**.
3. Enter:
   - **Overleaf Account Email**
   - **Git Password / Token** (obtained from Account Settings)
   - **Project ID** (obtained from project URL)
4. Click **Save & Connect**.
5. Click **Sync Overleaf** to fetch or push changes.

## License

MIT License. See LICENSE for details.
