# ZabLeaf

ZabLeaf is a lightweight desktop application for editing LaTeX documents offline and synchronizing changes with Overleaf using Git.

Developed by Diletta Abbonato (Zabbonat).

## Description

ZabLeaf provides an offline LaTeX editor interface with a side-by-side PDF preview. Changes made while offline are saved locally and pushed to your Overleaf project via Git when an internet connection is available.

It supports accounts authenticated through standard Overleaf logins, Google SSO, ORCID, or GitHub-linked repositories.

## Key Features

- Offline LaTeX editor using the Monaco Editor engine.
- Real-time side-by-side PDF preview.
- Bidirectional synchronization with Overleaf via Git (`git.overleaf.com`).
- Offline-first local file storage.
- Support for Overleaf accounts, Google SSO, and ORCID tokens.
- Merge conflict resolution interface.

## How to Download and Run

### Prerequisites

- Node.js (version 18 or higher)
- Git

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/Zabbonat/ZabLeaf.git
   cd ZabLeaf
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

4. Build the production package:
   ```bash
   npm run build
   ```

## Overleaf Git Setup

1. Log into your Overleaf account.
2. Go to Account Settings -> Git Integration.
3. Generate or view your Git Password / Access Token.
4. In ZabLeaf, open Account Settings and enter your Overleaf Email, Git Token, and Project ID.

## License

MIT License. See LICENSE for details.
