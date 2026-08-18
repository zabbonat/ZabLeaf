// Test raw HTTPS request to Overleaf Git server
const https = require('https');

// Try a few URL formats to see which one works
const token = 'olp_9kTBU2MAjaGGikcoQvhrXfXviDtsQJ2Eckim';

// Ask user for their project ID
const projectId = process.argv[2];

if (!projectId) {
  console.log("Usage: node test-overleaf-auth.cjs <project-id-or-url>");
  console.log("Example: node test-overleaf-auth.cjs 65e8abc123def456");
  console.log("Example: node test-overleaf-auth.cjs https://www.overleaf.com/project/65e8abc123def456");
  process.exit(1);
}

// Extract clean project ID
const cleanId = projectId
  .replace('https://www.overleaf.com/project/', '')
  .replace('https://git.overleaf.com/', '')
  .replace(/\/+$/, '')
  .split('?')[0]
  .trim();

console.log(`\nExtracted project ID: "${cleanId}"`);
console.log(`ID length: ${cleanId.length}`);
console.log(`Git URL will be: https://git.overleaf.com/${cleanId}\n`);

// Test 1: info/refs with username 'git'
const url1 = `https://git.overleaf.com/${cleanId}/info/refs?service=git-upload-pack`;
console.log(`--- Test 1: GET ${url1}`);
console.log(`    Auth: git:${token.substring(0, 8)}...`);

const req1 = https.get(url1, { auth: `git:${token}` }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`    Status: ${res.statusCode}`);
    console.log(`    Headers: ${JSON.stringify(res.headers, null, 2)}`);
    if (data.length > 500) {
      console.log(`    Body (first 500 chars): ${data.substring(0, 500)}`);
    } else {
      console.log(`    Body: ${data}`);
    }
    console.log('');
    
    // Test 2: Try with email as username
    const url2 = url1;
    console.log(`--- Test 2: GET ${url2}`);
    console.log(`    Auth: diletta.abbonato@unimib.it:${token.substring(0, 8)}...`);
    
    https.get(url2, { auth: `diletta.abbonato@unimib.it:${token}` }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log(`    Status: ${res2.statusCode}`);
        if (data2.length > 500) {
          console.log(`    Body (first 500 chars): ${data2.substring(0, 500)}`);
        } else {
          console.log(`    Body: ${data2}`);
        }
      });
    });
  });
});

req1.on('error', (e) => {
  console.error(`    Error: ${e.message}`);
});
