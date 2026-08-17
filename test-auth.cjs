const https = require('https');

https.get('https://git.overleaf.com/60a1234567890abcdef12345/info/refs?service=git-upload-pack', (res) => {
  console.log("Status:", res.statusCode);
  console.log("Headers:", res.headers);
  res.on('data', d => process.stdout.write(d));
});
