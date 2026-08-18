const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fakeIndexedDB = require('fake-indexeddb');
global.indexedDB = fakeIndexedDB;
const LightningFS = require('@isomorphic-git/lightning-fs');
const fs = new LightningFS('fs');

async function run() {
  const dir = '/test-repo';
  console.log("Starting clone...");
  try {
    await git.clone({
      fs,
      http,
      dir,
      url: 'https://github.com/zabbonat/ZabbLeaf.git',
      singleBranch: true,
      depth: 1
    });
    console.log("Clone success!");
    const entries = await fs.promises.readdir(dir);
    console.log("Files found by fs.promises.readdir:", entries);
  } catch (err) {
    console.error("Clone failed:", err);
  }
}

run();
