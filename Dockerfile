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
    git \
    npm \
    nodejs \
    bc && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

RUN git clone https://github.com/Sebelino/tables
RUN git clone https://github.com/Sebelino/AAXtoMP3

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





