# aax-to-mp3
Simple dockerized Node.js web service for converting an AAX (or AAXC) file into an MP3 file.

## Usage
Install [Docker](https://www.docker.com/), then run:
```
$ docker run -p 80:80 sebelino/aax-to-mp3
```
Then fire up http://localhost:80/ in your browser.

![Usage example](https://user-images.githubusercontent.com/837775/204081687-34001d41-1c44-4e06-82e2-ecf4cb095586.png)

### Convert AAX

Click the upload button, select your `.aax` file, and click `Convert`. The whole conversion should take 5-10 minutes, depending on how large your file is.

An MP3 file named `audiobook.mp3` will be downloaded when processing is complete.

### Convert AAXC

If you are trying to convert a AAXC file, you need to upload three extra files related to your audiobook.
The files will be named something like this:

* `example-AAX_22_64.aaxc`
* `example-AAX_22_64.voucher`
* `example-chapters.json`
* `example_(1215).jpg`

Click the upload button, select all four files (using the **Ctrl** or **Command** key), and click `Convert`.

![image](https://user-images.githubusercontent.com/837775/214339109-388f75f7-fba8-4517-ae8b-79c2d9e291aa.png)

If your filename of your AAXC file does not end with the `.aaxc` file extension, rename it.

## Manual installation
Install [Docker](https://www.docker.com/), then build the image yourself:
```
$ git clone git@github.com:Sebelino/aax-to-mp3
$ cd aax-to-mp3/
$ docker build -t sebelino/aax-to-mp3:dev .
```

## Notes
Get checksum:
```bash
$ docker run -p 80:80 -v /tmp/book:/data -it sebelino/aax-to-mp3:dev bash -c "ffprobe -loglevel debug /data/sample.aax 2>&1 | grep checksum | sed 's/.*checksum == \(\w\+\)/\1/'"
a83ff00cb34b25efd48fcc0719805f302325ec90
```
