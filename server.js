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

async function getChecksum(path) {
    console.log("Processing file:", path);

    const ffprobe = spawn('ffprobe', ['-loglevel', 'debug', path]);
    const grep = spawn('grep', ['checksum']);
    const sed = spawn('sed', ['s/.*checksum == \\(\\w*\\)/\\1/']);

    ffprobe.stderr.pipe(grep.stdin)
    grep.stdout.pipe(sed.stdin)

    var checksum;
    for await (const data of sed.stdout) {
        checksum = data;
    }
    return checksum;
}

async function getActivationBytes(path, checksum) {
    console.log(`checksum is [${checksum}]`)
    // TODO find a way to trim checksum in getChecksum(...)
    const rcrack = spawn('./rcrack', ['.', '-h', checksum.trim()]);

    var activationBytes;
    for await (const data of rcrack.stdout) {
        console.log(data);
        activationBytes = data;
    }
    return activationBytes;
    //for await (const data of rcrack.stderr) {
    //    return data;
    //}
}

async function processFile(path) {
    const checksum = await getChecksum(path);
    console.log(`Checksum from ffprobe: ${checksum}`);
    process.chdir('tables');
    const activationBytes = await getActivationBytes(path, checksum);
    console.log(`Activation bytes: ${activationBytes}`);
}

app.post('/submit-form', (req, res) => {
    new formidable.IncomingForm().parse(req)
    .on('file', (name, file) => {
        console.log('Uploaded file', name, file.name);
        const newPath = path.join("/tmp/", file.name)
        fs.copy(file.path, newPath, function(err) {
            if (err) {
                console.error(err);
            } else {
                console.log("copied file success!");
            }
        })
        processFile(newPath);
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
