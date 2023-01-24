'use strict';

const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const {spawn} = require('child_process');
const process = require('process');
const webSocket = require('ws');
const rimraf = require('rimraf');
const glob = require('glob');
const server = require('http').createServer();

const PORT = process.env.AAX_TO_MP3_PORT || 80;
const HOST = '0.0.0.0';
const TMP_DIR = '/tmp/aax2mp3/';
const WORKDIR = '/usr/src/app';

let globalWs = null;

process.on('SIGINT', function () {
    process.exit();
});

if (fs.existsSync(TMP_DIR)) {
    rimraf.sync(TMP_DIR);
}
fs.mkdirSync(TMP_DIR);

const stream = fs.createWriteStream(path.join(TMP_DIR, "server.log"));
const app = express();

app.use('/static', express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/output/', (req, res) => {
    res.sendFile(path.join(__dirname, 'output.html'));
});

app.get('/download/', (req, res) => {
    res.download(path.join(TMP_DIR, "audiobook.mp3"));
});

function output(string) {
    console.log(string);
    stream.write(string + "\n");
    if (globalWs !== null) {
        globalWs.send(`${string}`);
    }
}

function getChecksum(path) {
    return new Promise((resolve, reject) => {
        output(util.format("Processing file:", path));

        const ffprobe = spawn('ffprobe', ['-loglevel', 'debug', path]);
        const grep = spawn('grep', ['checksum']);
        const sed = spawn('sed', ['s/.*checksum == \\(\\w\\+\\)/\\1/']);

        ffprobe.stderr.pipe(grep.stdin);
        grep.stdout.pipe(sed.stdin);

        let checksum;
        sed.stdout.on('data', function (data) {
            output(util.format("sed stdout:"));
            checksum = data;
        });
        sed.on('close', function (code) {
            output(util.format("sed closed with exit code", code));
            resolve(checksum.toString().trim());
        });
        sed.on('error', function (err) {
            output(util.format("sed encountered an error"));
            reject(err);
        });
    });
}

async function getActivationBytes(checksum) {
    return new Promise((resolve) => {
        const rcrack = spawn('./rcrack', ['.', '-h', checksum]);
        const grep = spawn('grep', ['hex:']);
        const sed = spawn('sed', ['s/.*hex:\\(\\w\\+\\)/\\1/']);

        rcrack.stdout.pipe(grep.stdin);
        grep.stdout.pipe(sed.stdin);

        rcrack.stdout.on('data', function (data) {
            output(util.format('rcrack stdout:', data));
        });
        rcrack.stderr.on('data', function (data) {
            output(util.format('rcrack stderr:', data.toString()));
        });
        rcrack.on('close', function (code) {
            output(util.format('rcrack closed with exit code', code));
        });

        let activationBytes;
        sed.stdout.on('data', function (data) {
            activationBytes = data;
        });
        sed.on('close', function (code) {
            output(util.format('sed code', code));
            resolve(activationBytes.toString().trim());
        });
    });
}

async function processMp3Files() {
    const outdir = "Audiobook";
    const author = fs.readdirSync(path.join(TMP_DIR, outdir))[0];
    const title = fs.readdirSync(path.join(TMP_DIR, outdir, author))[0];

    process.chdir(path.join(TMP_DIR, outdir, author, title));

    const mp3Files = glob.sync("*.mp3");
    const inputstring = "concat:" + mp3Files.join("|");
    const outputfile = "audiobook.mp3";

    output(util.format("Concatenating mp3 files..."));
    const ffmpeg = spawn('ffmpeg', ['-i', inputstring, '-acodec', 'copy', outputfile]);

    ffmpeg.stdout.on('data', function (data) {
        output(util.format('ffmpeg stdout:', data.toString()));
    });
    ffmpeg.stderr.on('data', function (data) {
        output(util.format('ffmpeg stderr:', data.toString()));
    });
    ffmpeg.on('close', function (code) {
        output(util.format('ffmpeg closed with exit code', code));
        fs.copyFileSync(outputfile, path.join(TMP_DIR, outputfile), 0);
        output('link /download');
    });
}

async function processActivationBytes(activationBytes, path) {
    process.chdir('../AAXtoMP3');

    output(util.format("Running AAXtoMp3..."));
    const aaxtomp3 = spawn('./AAXtoMP3', ['--authcode', activationBytes, path]);

    aaxtomp3.stdout.on('data', function (data) {
        output(util.format('aaxtomp3 stdout:', data.toString()));
    });
    aaxtomp3.stderr.on('data', function (data) {
        output(util.format('aaxtomp3 stderr:', data.toString()));
    });
    aaxtomp3.on('close', function (code) {
        output(util.format('aaxtomp3 closed with exit code', code));
        processMp3Files();
    });
}

async function processWithoutActivationBytes(path) {
    process.chdir('./AAXtoMP3');

    output(util.format("Running AAXtoMp3 without activation bytes..."));
    const aaxtomp3 = spawn('./AAXtoMP3', [path]);

    aaxtomp3.stdout.on('data', function (data) {
        output(util.format('aaxtomp3 stdout:', data.toString()));
    });
    aaxtomp3.stderr.on('data', function (data) {
        output(util.format('aaxtomp3 stderr:', data.toString()));
    });
    aaxtomp3.on('close', function (code) {
        output(util.format('aaxtomp3 closed with exit code', code));
        processMp3Files();
    });
}

async function processChecksum(checksum, path) {
    process.chdir('tables');

    output(util.format("Computing activation bytes -- please wait..."));
    const activationBytesPromise = getActivationBytes(checksum);

    activationBytesPromise.then(function (activationBytes) {
        output(util.format(`Activation bytes: ${activationBytes}`));
        processActivationBytes(activationBytes, path);
    });
}

async function processFile(file) {
    // Give WebSockets some time to connect
    await new Promise(done => setTimeout(done, 100));

    process.chdir(WORKDIR); // Switch back to the workdir in case pwd has changed

    const newPath = path.join(TMP_DIR, file.name);
    fs.copyFileSync(file.path, newPath, 0);

    const extension = path.extname(file.name)

    if (extension === ".aaxc") {
        output("Processing AAXC file...");
        processWithoutActivationBytes(newPath);
    } else if (extension === ".voucher" || extension === ".json" || extension === ".jpg") {
        output(util.format(`Got ${extension} file. I am going to assume it will be used for converting an AAXC file.`));
    } else if (extension === ".aax") {
        output("Processing AAX file...");
        const checksumPromise = getChecksum(newPath);
        checksumPromise.then(function (checksum) {
            output(util.format("Checksum from ffprobe:", checksum));
            processChecksum(checksum, newPath);
        });
    } else {
        output(util.format(`Expected a file with any of the extensions ['.aax', '.aaxc', '.voucher', 'json', 'voucher'], got: ${extension}`));
    }
}

const wss = new webSocket.Server({
    server: server
});

server.on('request', app);

wss.on('connection', ws => {
    output('Server: Connection established');
    ws.on('message', message => {
        console.log(`Received message => ${message}`);
    });
    ws.send('Server: Hello.');

    globalWs = ws;
});

app.post('/submit-form', (req, res) => {
    const options = {
        maxFileSize: 20 * 1024 * 1024 * 1024 // 20GB
    }
    new formidable.IncomingForm(options).parse(req)
        .on('file', (name, file) => {
            output(util.format('Uploaded file', name, file.name));
            processFile(file);
        })
        .on('aborted', () => {
            console.error('Request aborted by user');
        })
        .on('error', (err) => {
            console.error('Error', err);
            throw err
        })
        .on('end', () => {
            res.redirect("/output/")
        })
});

server.listen(PORT, function() {
    console.log(`http/ws server listening on ${PORT}`);
});

output(util.format(`Running on http://${HOST}:${PORT}`));
