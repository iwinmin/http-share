const { createServer } = require('http');
const { createReadStream, statSync } = require('fs');
const { networkInterfaces } = require('os');
var qrcode = require('qrcode-terminal');

const file_path = process.argv[2];

if (!file_path) {
  console.error('No file path');
  return process.exit(-1);
}

function server(stat) {

  const token = ['/'];
  for (let len=16; len-->0;) {
    token.push(String.fromCharCode(97 + Math.floor(Math.random() * 26)));
  }
  const path = token.join('');
  const file_name = file_path.split(/[/\\]/).pop();

  const sv = createServer((req, res) => {
    if (req.url === path) {
      console.log('[%s] new Request - %s', (new Date()).toLocaleString(), req.socket.remoteAddress);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
      createReadStream(file_path).pipe(res);
    }
    else {
      res.end('Invalid Request');
    }
  });

  sv.on('error', err => {
    console.error('Start server', err.toString());
  });

  sv.listen(() => {
    const { port } = sv.address();
    const ifs = [].concat(...Object.values(networkInterfaces()))
                  .filter(a => (!a.internal && a.family === 'IPv4'))
                  .map(a => [a.address, a.family]);

    const [[host]] = ifs;

    const url = `http://${host}:${port}${path}`;

    qrcode.generate(url);
    console.log('URL:', url);
  });

}

try {
  server(statSync(file_path));
}
catch (err) {
  console.error('Access File:', err.toString());
  return process.exit(-1);
}