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

        rcrack.stdout.on('data', function(data) {
            console.log('rcrack GOT STDOUT', data);
        });
        rcrack.stderr.on('data', function(data) {
            console.log('rcrack GOT STDERR', data.toString());
        });
        rcrack.on('close', function(code) {
            console.log('rcrack close', code);
        });

        var activationBytes;
        sed.stdout.on('data', function(data) {
            activationBytes = data;
        });
        sed.on('close', function(code) {
            console.log('sed code', code);
            resolve(activationBytes.toString().trim());
        });
    });
}

async function processActivationBytes(activationBytes, path) {
    process.chdir('../AAXtoMP3');

    console.log("Running AAXtoMp3...");
    const aaxtomp3 = spawn('./AAXtoMP3', ['--authcode', activationBytes, path]);

    aaxtomp3.stdout.on('data', function(data) {
        console.log('aaxtomp3 GOT STDOUT', data.toString());
    });
    aaxtomp3.stderr.on('data', function(data) {
        console.log('aaxtomp3 GOT STDERR', data.toString());
    });
    aaxtomp3.on('close', function(code) {
        console.log('aaxtomp3 close', code);
    });
}

async function processChecksum(checksum, path) {
    process.chdir('tables');

    console.log("Computing activation bytes...");
    const activationBytesPromise = getActivationBytes(checksum);

    activationBytesPromise.then(function(activationBytes) {
        console.log(`Activation bytes: ${activationBytes}`);
        processActivationBytes(activationBytes, path);
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
        processChecksum(checksum, newPath);
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
