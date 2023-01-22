FROM debian:unstable-20230109-slim@sha256:69e10d7ba95513185b0e650e8f8f1c36152c7d35ae7baee43585a29f652ccf7a

RUN apt-get -y update && \
    apt-get -y install \
    curl \
    yasm \
    nasm \
    build-essential \
    automake \
    autoconf \
    ffmpeg \
    libtool \
    pkg-config \
    libcurl4-openssl-dev \
    intltool \
    libxml2-dev \
    libgtk2.0-dev \
    libnotify-dev \
    libglib2.0-dev \
    libevent-dev \
    mediainfo \
    wget \
    time \
    checkinstall \
    libmp3lame-dev \
    npm \
    nodejs \
    unzip \
    bc && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV TABLES_SHA     1d7389a8fba5764fb80f40898e8f647567ca2dda
ENV AAX_TO_MP3_SHA 1544a8924971223fe5bce068f66949bb7d4f7128

RUN wget https://github.com/Sebelino/tables/archive/$TABLES_SHA.zip && \
    unzip $TABLES_SHA.zip && \
    mv tables-$TABLES_SHA tables && \
    rm $TABLES_SHA.zip
RUN wget https://github.com/Sebelino/AAXtoMP3/archive/$AAX_TO_MP3_SHA.zip && \
    unzip $AAX_TO_MP3_SHA.zip && \
    mv AAXtoMP3-$AAX_TO_MP3_SHA AAXtoMP3 && \
    rm $AAX_TO_MP3_SHA.zip

COPY package.json package-lock.json ./

RUN npm install

SHELL ["/bin/bash", "-c"]

EXPOSE 80

# Bundle app source
COPY index.html output.html server.js ./
COPY public/ public/

CMD ["node", "server.js"]
