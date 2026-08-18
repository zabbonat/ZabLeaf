const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

async function run() {
  const dir = path.join(__dirname, 'test-real-clone');
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);

  const url = 'https://git.overleaf.com/6a6a84fe7cba2c6cd0ff9f3e';
  const token = 'olp_9kTBU2MAjaGGikcoQvhrXfXviDtsQJ2Eckim';

  console.log(`Cloning ${url} ...`);
  try {
    await git.clone({
      fs,
      http,
      dir,
      url,
      singleBranch: true,
      depth: 1,
      onAuth: () => ({ username: 'git', password: token })
    });
    console.log("✅ Clone SUCCESS!");
    
    // List all files recursively
    const walk = (d, prefix = '') => {
      const entries = fs.readdirSync(d);
      for (const e of entries) {
        const full = path.join(d, e);
        const rel = prefix ? `${prefix}/${e}` : e;
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (e !== '.git') {
            console.log(`  📁 ${rel}/`);
            walk(full, rel);
          }
        } else {
          console.log(`  📄 ${rel} (${stat.size} bytes)`);
        }
      }
    };
    walk(dir);
  } catch (err) {
    console.error("❌ Clone FAILED:", err.message || err);
  }
}

run();
