# aax-to-mp3
Simple dockerized Node.js web service for converting an AAX file into an MP3 file.

## Usage
```
$ docker run -p 8082:8081 -p 8087:8087 sebelino/aax-to-mp3
```
Then fire up http://localhost:8082/ in your browser.

Select your AAX file and click `Convert`. It should take roughly 5 minutes for the file to be processed.

The MP3 file will be downloaded when processing is complete.

## Manual installation
Install [Docker](https://www.docker.com/), then build the image yourself:
```
$ git clone git@github.com:Sebelino/aax-to-mp3
$ cd aax-to-mp3
$ docker build -t sebelino/aax-to-mp3 .
```
