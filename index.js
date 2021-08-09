const { createServer } = require('http');
const { createReadStream, statSync, createWriteStream } = require('fs');
const { networkInterfaces } = require('os');
var qrcode = require('qrcode-terminal');

const file_path = process.argv[2];

function server(stat) {

  const token = ['/'];
  for (let len=8; len-->0;) {
    token.push(String.fromCharCode(97 + Math.floor(Math.random() * 26)));
  }
  const path = token.join('');
  const file_name = file_path.split(/[/\\]/).pop();

  const sv = createServer((req, res) => {
    if (req.url === path) {
      console.log('[%s] new Request - %s', (new Date()).toLocaleString(), req.socket.remoteAddress);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file_name)}"`);
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

/**
 * Recive File from mobile device
 */
function upload_server() {
  const token = ['/'];
  for (let len=8; len-->0;) {
    token.push(String.fromCharCode(97 + Math.floor(Math.random() * 26)));
  }
  const path = token.join('');
  const cwd = process.cwd();

  const sv = createServer((req, res) => {
    const { url } = req;
    if (!url.startsWith(path)) {
      return res.end('Invalid Request');
    }

    // upload file
    if (url === path + '/upload' && req.method === 'POST') {
      try {
        const file_name = decodeURIComponent(req.headers['upload-file-name']);
        const file_path = cwd + '/' + file_name;

        console.log('- New Upload:', file_name);
        req.pipe(createWriteStream(file_path)).once('close', () => {
          res.end(`Saved to: ${file_path}`);
        });
      }
      catch (err) {
        res.end('Exception - ' + err);
      }
    }
    else {
      // return upload page html
      createReadStream(__dirname + '/upload.html').pipe(res);
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
    console.log('Save folder:', cwd);
  });
}

try {
  if (!file_path) {
    // no input file name, upload mode
    upload_server();
  }
  else {
    server(statSync(file_path));
  }
}
catch (err) {
  console.error('Access File:', err.toString());
  return process.exit(-1);
}
