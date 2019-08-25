'use strict';

const express = require('express');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const process = require('process');

const PORT = 8081;
const HOST = '0.0.0.0';

process.on('SIGINT', function() {
    process.exit();
})

const app = express();

app.get('/', (req, res) => {
    //res.send('Hello world\n');
    res.sendFile(path.join(__dirname + '/index.html'));
});

function getChecksum(path) {
    return new Promise((resolve, reject) => {
        console.log("Processing file:", path);

        const ffprobe = spawn('ffprobe', ['-loglevel', 'debug', path]);
        const grep = spawn('grep', ['checksum']);
        const sed = spawn('sed', ['s/.*checksum == \\(\\w\\+\\)/\\1/']);

        ffprobe.stderr.pipe(grep.stdin)
        grep.stdout.pipe(sed.stdin)

        var checksum;
        sed.stdout.on('data', function(data) {
            console.log("sed GOT SOME DATA");
            checksum = data;
        });
        sed.on('close', function(code) {
            console.log("sed close code", code);
            resolve(checksum.toString().trim());
        });
        sed.on('error', function(err) {
            console.log("sed ONE MORE CALL REJECTED");
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

        var activationBytes;
        sed.stdout.on('data', function(data) {
            activationBytes = data;
        });
        sed.on('close', function(code) {
            resolve(activationBytes.toString().trim());
        });
    });
}

async function processChecksum(checksum) {
    process.chdir('tables');

    console.log("Computing activation bytes...");
    const activationBytesPromise = getActivationBytes(checksum);

    activationBytesPromise.then(function(activationBytes) {
        console.log(`Activation bytes: ${activationBytes}`);
    });
}

async function processFile(file) {
    const newPath = path.join("/tmp/", file.name)
    fs.copyFileSync(file.path, newPath, function(err) {
        if (err) {
            console.log("COPIED FILE FAILED", err);
        } else {
            console.log("COPIED FILE SUCCESS!");
        }
    })

    const checksumPromise = getChecksum(newPath);

    checksumPromise.then(function(checksum) {
        console.log("Checksum from ffprobe", checksum);
        processChecksum(checksum);
    });
}

app.post('/submit-form', (req, res) => {
    new formidable.IncomingForm().parse(req)
    .on('file', (name, file) => {
        console.log('Uploaded file', name, file.name);
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
        console.error('Ending');
        res.end()
    })
})

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
