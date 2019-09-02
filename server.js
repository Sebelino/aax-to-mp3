'use strict';

const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const { exec, spawn } = require('child_process');
const process = require('process');
const webSocket = require('ws');
const rimraf = require('rimraf');

const PORT = 8081;
const WS_PORT = 8087;
const HOST = '0.0.0.0';
const TMP_DIR = '/tmp/aax2mp3/';
const JQUERY_FILE = "jquery-3.4.1.min.js";

let globalWs = null;

process.on('SIGINT', function() {
    process.exit();
})

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

function output(string) {
    console.log(string);
    stream.write(string + "\n");
    if (globalWs !== null) {
        console.log("GLOBALWS WAS NOT NULL!!!!!!!!!!!!!!!!!!!!!!!!");
        globalWs.send(`${string}`);
    }
}

function getChecksum(path) {
    return new Promise((resolve, reject) => {
        output(util.format("Processing file:", path));

        const ffprobe = spawn('ffprobe', ['-loglevel', 'debug', path]);
        const grep = spawn('grep', ['checksum']);
        const sed = spawn('sed', ['s/.*checksum == \\(\\w\\+\\)/\\1/']);

        ffprobe.stderr.pipe(grep.stdin)
        grep.stdout.pipe(sed.stdin)

        var checksum;
        sed.stdout.on('data', function(data) {
            output(util.format("sed GOT SOME DATA"));
            checksum = data;
        });
        sed.on('close', function(code) {
            output(util.format("sed closed with exit code", code));
            resolve(checksum.toString().trim());
        });
        sed.on('error', function(err) {
            output(util.format("sed ONE MORE CALL REJECTED"));
            reject(err);
        });
    });
}

async function getActivationBytes(checksum) {
    return new Promise((resolve, reject) => {
        const rcrack = spawn('./rcrack', ['.', '-h', checksum]);
        const grep = spawn('grep', ['hex:']);
        const sed = spawn('sed', ['s/.*hex:\\(\\w\\+\\)/\\1/']);

        rcrack.stdout.pipe(grep.stdin);
        grep.stdout.pipe(sed.stdin);

        rcrack.stdout.on('data', function(data) {
            output(util.format('rcrack GOT STDOUT', data));
        });
        rcrack.stderr.on('data', function(data) {
            output(util.format('rcrack GOT STDERR', data.toString()));
        });
        rcrack.on('close', function(code) {
            output(util.format('rcrack closed with exit code', code));
        });

        var activationBytes;
        sed.stdout.on('data', function(data) {
            activationBytes = data;
        });
        sed.on('close', function(code) {
            output(util.format('sed code', code));
            resolve(activationBytes.toString().trim());
        });
    });
}

async function processActivationBytes(activationBytes, path) {
    process.chdir('../AAXtoMP3');

    output(util.format("Running AAXtoMp3..."));
    const aaxtomp3 = spawn('./AAXtoMP3', ['--authcode', activationBytes, path]);

    aaxtomp3.stdout.on('data', function(data) {
        output(util.format('aaxtomp3 GOT STDOUT', data.toString()));
    });
    aaxtomp3.stderr.on('data', function(data) {
        output(util.format('aaxtomp3 GOT STDERR', data.toString()));
    });
    aaxtomp3.on('close', function(code) {
        output(util.format('aaxtomp3 closed with exit code', code));
    });
}

async function processChecksum(checksum, path) {
    process.chdir('tables');

    output(util.format("Computing activation bytes -- please wait..."));
    const activationBytesPromise = getActivationBytes(checksum);

    activationBytesPromise.then(function(activationBytes) {
        output(util.format(`Activation bytes: ${activationBytes}`));
        processActivationBytes(activationBytes, path);
    });
}

async function processFile(file) {
    // Give WebSockets some time to connect
    await new Promise(done => setTimeout(done, 100));

    const newPath = path.join(TMP_DIR, file.name)
    fs.copyFileSync(file.path, newPath, 0, function(err) {
        if (err) {
            output(util.format("COPIED FILE FAILED", err));
        } else {
            output(util.format("COPIED FILE SUCCESS!"));
        }
    });

    const checksumPromise = getChecksum(newPath);

    checksumPromise.then(function(checksum) {
        output(util.format("Checksum from ffprobe:", checksum));
        processChecksum(checksum, newPath);
    });
}

const wss = new webSocket.Server({
    port: WS_PORT
});

wss.on('connection', ws => {
    console.log('ON CONNECTION!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    ws.on('message', message => {
        console.log(`Received message => ${message} ${i}`);
    });
    ws.send('hoy from server')

    globalWs = ws;
});

app.post('/submit-form', (req, res) => {
    new formidable.IncomingForm().parse(req)
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

app.listen(PORT, HOST);
output(util.format(`Running on http://${HOST}:${PORT}`));
