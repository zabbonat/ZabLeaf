const https = require('https');

const url = 'https://git.overleaf.com/60a1234567890abcdef12345/info/refs?service=git-upload-pack';
const options = {
  auth: 'git:olp_9kTBU2MAjaGGikcoQvhrXfXviDtsQJ2Eckim'
};

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Body:", data);
  });
});
