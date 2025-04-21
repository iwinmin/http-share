#!/usr/bin/env node

const { createServer } = require('http');
const { createReadStream, statSync, existsSync, createWriteStream, opendirSync } = require('fs');
const { dirname, basename } = require('node:path');
const { networkInterfaces } = require('os');
var qrcode = require('./vendor/qrcode-terminal');

function file_content_type(file_path) {
  const [_, ext] = file_path.match(/\.([^./]+)$/) || [];
  const contentTypes = {
    // 图片文件
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    // 音乐文件
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    wav: 'audio/wav',
    // 视频文件
    mp4: 'video/mp4',
    webm: 'video/webm',
    oggv: 'video/ogg',
    // 文本文件
    txt: 'text/plain; charset=utf-8',
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    json: 'application/json; charset=utf-8',
    pdf: 'application/pdf',
  };
  const binaryTypes = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'exe'];
  if (binaryTypes.includes(ext?.toLowerCase())) {
    return 'application/octet-stream';
  }
  else {
    return contentTypes[ext?.toLowerCase()] || contentTypes.txt;
  }
}

/**
 * Service file download server
 */
function server({ file_path, token='', port=0}) {
  if (!token) {
    while (token.length < 4) {
      token += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
  }

  const stat = statSync(file_path);
  const pathroot = `/${token}`;

  const sv = createServer((req, res) => {
    let { url } = req;
    if (url === '/favicon.ico') {
      return res.writeHead(404).end();
    }

    if (stat.isDirectory()) {
      // 目录下载
      if (url === pathroot) {
        url += '/';
      }
      const base_root = `${pathroot}/`;
      if (url.startsWith(base_root)) {
        try {
          let page = '';
          let path = url.replace(base_root, '');
          if (path === '') {
            page = indexPage(pathroot, file_path, true);
          }
          else {
            path = decodeURIComponent(path);
            const child_path = `${file_path}/${path}`;
            const path_stat = statSync(child_path);

            if (path_stat.isDirectory()) {
              // child directory
              page = indexPage(`${pathroot}/${path}`, child_path, false);
            }
            else {
              // file download
              const file_name = basename(path);
              const file_type = params.view_mode ? file_content_type(path) : 'application/octet-stream';

              console.info('[%s] new Request - %s', (new Date()).toLocaleString(), req.socket.remoteAddress);
              res.setHeader('Content-Length', path_stat.size);
              res.setHeader('Content-Type', file_type);
              if (file_type === 'application/octet-stream') {
                res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file_name)}"`);
              }
              createReadStream(child_path).pipe(res);
              return;
            }
          }

          if (page) {
            // 返回索引目录
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(page);
            return;
          }
        }
        catch (err) {
          res.writeHead(500).end(`Server Error: ${err.toString()}`);
          return;
        }
      }
    }
    else if (url === pathroot) {
      // 单文件下载
      const file_name = basename(file_path);
      const file_type = params.view_mode ? file_content_type(file_path) : 'application/octet-stream';
      console.info('[%s] new Request - %s', (new Date()).toLocaleString(), req.socket.remoteAddress);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', file_type);
      if (file_type === 'application/octet-stream') {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file_name)}"`);
      }
      createReadStream(file_path).pipe(res);
      return;
    }

    // 无效请求
    console.error('[%s] Invalid request - %s - %s', (new Date()).toLocaleString(), req.method, url);
    res.writeHead(400).end('Invalid Request');
  });

  sv.on('error', err => {
    console.error('Start server', err.toString());
  });

  // 可以指定端口
  sv.listen(port, () => {
    const ifs = [].concat(...Object.values(networkInterfaces()))
                  .filter(a => (!a.internal && a.family === 'IPv4'))
                  .map(a => [a.address, a.family]);

    const [[host]] = ifs;
    const { port } = sv.address();

    const url = `http://${host}:${port}${pathroot}`;

    qrcode.generate(url);
    console.log(`
------------------------------------
 HTTP-DROP Download Server started!
------------------------------------
 * Download URL:  ${url}
 * Download Path: ${file_path}

 > RUN ( http-drop -h ) for more options help
`);
  });
}

function indexPage(base_url, file_path, is_root) {
  let ent;
  const html = [
    '<html><head>',
    '<title>HTTP-DROP - Download Index</title>',
    '<style>',
    'table { border-spacing: 0; border: 1px solid; }',
    'th,td { text-align: left; padding: 5px 10px; }',
    'tr:nth-child(odd) { background: lightgray; }',
    '</style>',
    '</head><body>',
    `<p>Current Path: <strong>${file_path}</strong></p>`,
    '<table><tr>',
    '<th>Type</th>',
    '<th>Name</th>',
    '<th>Size</th>',
    '<th>Date</th>',
    '</tr>',
  ];

  if (!is_root) {
    html.push(`<tr><td></td><td><a href="${dirname(base_url)}"><i>{Parent Directory}</i></a></td><td></td><td></td></tr>`);
  }

  const dirs = opendirSync(file_path);
  while (ent = dirs.readSync()) {
    const stat = statSync(`${file_path}/${ent.name}`);
    html.push(
      '<tr>',
      `<td>${ent.isDirectory() ? '🗂' : '📄' }</td>`,
      `<td><a href="${encodeURIComponent(base_url + '/' + ent.name).replaceAll('%2F','/')}">${ent.name.replace(/</g, '&lt;')}</a></td>`,
      `<td>${stat.size.toLocaleString('en')}</td>`,
      `<td>${stat.mtime.toLocaleString()}</td>`,
      '</tr>',
    );
  }
  html.push(
    '</table>',
    '</body></html>',
  );
  dirs.closeSync();

  return html.join('\n');
}

/**
 * Recive File from mobile device
 */
function upload_server({ token='', port=0 }) {
  if (!token) {
    while (token.length < 6) {
      token += String.fromCharCode(97 + Math.floor(Math.random() * 26));
    }
  }
  const path = `/${token}`;
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

        if (existsSync(file_path)) {
          console.error('path exists', file_path);
          return res.end(`File ${file_name} exists on computer! upload abort!`);
        }

        console.log('- New Upload:', file_name);
        req.pipe(createWriteStream(file_path))
        req.once('end', () => {
          res.end(`Saved to: ${file_path}`);
        });
      }
      catch (err) {
        res.end('Exception - ' + err);
      }
    }
    else if (url === path + '/message' && req.method === 'POST') {
      console.log('New Message:\n------');
      req.pipe(process.stdout);
      req.once('end', () => {
        console.log('\n------');
        res.end('Message Recived!');
      });
    }
    else {
      // return upload page html
      createReadStream(__dirname + '/upload.html').pipe(res);
    }
  });

  sv.on('error', err => {
    console.error('Start server', err.toString());
  });

  sv.listen(port, () => {
    const ifs = [].concat(...Object.values(networkInterfaces()))
                  .filter(a => (!a.internal && a.family === 'IPv4'))
                  .map(a => [a.address, a.family]);

    const [[host]] = ifs;
    const { port } = sv.address();

    const url = `http://${host}:${port}${path}`;

    qrcode.generate(url);
    console.log(`
----------------------------------
 HTTP-DROP Upload Server started!
----------------------------------
 * Upload URL:  ${url}
 * Upload Path: ${cwd}

 > RUN ( http-drop -h ) for more options help..
`);
  });
}

function printHelp() {
  console.log(`
----------------------------------
 HTTP-DROP Download/Upload Server
----------------------------------

http-drop [OPTIONS]

  Start Upload server with current working directory(CWD) for uploading file
  and recive client message and print out to console screen.

http-drop [OPTIONS] <file/directory>

  Start Download server for <file/directory>.

OPTIONS:
  -v, --view                    View instead of Download if supported file format
  -i, --insecure                Server uses port 8080, path name uses [share]
  -p <number>, --port <number>  Server port number (Default: RANDOM port)
  -t <token>, --token <token>   Sefety URL path name (Default: RANDOM string)
  -h, --help                    This help screen
`);
  process.exit(0);
}

const params = {}
try {
  const argv = process.argv.slice(2);
  for (let i=0; i<argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-v':
      case '--view':
        params.view_mode = true;
        break;
      case '-i':
      case '--insecure':
        params.port = 8080;
        params.token = 'share';
        break;
      case '-p':
      case '--port':
        params.port = parseInt(argv[++i]);
        if (isNaN(params.port)) {
          throw new Error(`Invalid Port Number ${argv[i]}`);
        }
        break;
      case '-t':
      case '--token':
        params.token = argv[++i];
        if (!params.token) {
          throw new Error('Invalid Token String');
        }
        break;
      case '-h':
      case '--help':
        printHelp();
        break;
      default:
        params.file_path = arg;
        break;
    }
  }
}
catch (err) {
  console.error(err.message);
  process.exit(1)
}

try {
  if (params.file_path) {
    // service file download
    server(params);
  }
  else {
    // no input file name, upload mode
    upload_server(params);
  }
}
catch (err) {
  console.error('Access File:', err.toString());
  return process.exit(-1);
}
