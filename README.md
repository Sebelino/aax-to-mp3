# aax-to-mp3
Simple dockerized Node.js web service for converting an AAX file into an MP3 file.

## Usage
Install [Docker](https://www.docker.com/), then run:
```
$ docker run -p 80:80 sebelino/aax-to-mp3
```
Then fire up http://localhost:80/ in your browser.

![Usage example](https://user-images.githubusercontent.com/837775/204081687-34001d41-1c44-4e06-82e2-ecf4cb095586.png)

Select your AAX file and click `Convert`. The whole conversion should take 5-10 minutes.

The MP3 file will be downloaded when processing is complete.

## Manual installation
Install [Docker](https://www.docker.com/), then build the image yourself:
```
$ git clone git@github.com:Sebelino/aax-to-mp3
$ cd aax-to-mp3
$ docker build -t sebelino/aax-to-mp3 .
```

## Notes
Get checksum:
```bash
$ docker run -p 80:80 -v /tmp/book:/data -it sebelino/aax-to-mp3:dev bash -c "ffprobe -loglevel debug /data/sample.aax 2>&1 | grep checksum | sed 's/.*checksum == \(\w\+\)/\1/'"
a83ff00cb34b25efd48fcc0719805f302325ec90
```
