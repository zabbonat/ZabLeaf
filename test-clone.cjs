const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'test-repo');
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);

  console.log("Starting clone with username: git...");
  try {
    await git.clone({
      fs,
      http,
      dir,
      url: 'https://git.overleaf.com/60a1234567890abcdef12345',
      singleBranch: true,
      depth: 1,
      onAuth: () => ({
        username: 'git',
        password: 'olp_9kTBU2MAjaGGikcoQvhrXfXviDtsQJ2Eckim'
      })
    });
    console.log("Clone success!");
    const files = fs.readdirSync(dir);
    console.log("Files:", files);
  } catch (err) {
    console.error("Clone failed:", err.message, err.code, err.data);
  }
}

run();
