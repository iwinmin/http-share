# HTTP-DROP CLI tools

通过HTTP分享下载本地文件、文件夹。或允许其他设备通过HTTP上传文件到本地或发送文本消息。

> Share and download local files and folders via HTTP. Or allow other devices to upload files to local or send text messages via HTTP.

## Install

**Method 1**
```
npm install -g github:iwinmin/http-share
```

**Method 2**
```
npm install -g git+https://github.com/iwinmin/http-share.git
```


## Run

### 1. Upload Server

> Command: `http-drop [OPTIONS]`

  Start Upload server with current working directory(CWD) for uploading file
  and recive client message and print out to console screen.

### 2. Download Server

> Command: `http-drop [OPTIONS] <file/directory>`

  Start Download server for <file/directory>.

### 3. OPTIONS

  | Option Name | Comments |
  | -------|----------|
  | `-v`, `--view` | View instead of Download if supported file format |
  | `-i`, `--insecure` | Server uses port 8080, path name uses [share] |
  | `-p <number>`, `--port <number>` | Server port number (Default: RANDOM port) |
  | `-t <token>`, `--token <token>` | Sefety URL path name (Default: RANDOM string) |
  | `-h`, `--help` | Print help message |


## Usage

### Mobile phone

> scan the `QRCODE` on the screen

### Browser

> open the `URL` on the screan
