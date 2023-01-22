FROM debian:bullseye-slim@sha256:1acb06a0c31fb467eb8327ad361f1091ab265e0bf26d452dea45dcb0c0ea5e75

RUN apt-get -y update && \
    apt-get -y install curl && \
    apt-get -y install \
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

ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 12.9.0
RUN curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash \
        && source $NVM_DIR/nvm.sh \
        && nvm install $NODE_VERSION \
        && nvm alias default $NODE_VERSION \
        && nvm use default

# TODO not sure if this path is right
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules

ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

EXPOSE 80

# Bundle app source
COPY index.html output.html server.js ./
COPY public/ public/

CMD ["node", "server.js"]





