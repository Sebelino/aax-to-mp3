FROM debian:stretch

RUN apt-get -y update
RUN apt-get -y install yasm nasm \
                build-essential automake autoconf \
                libtool pkg-config libcurl4-openssl-dev \
                intltool libxml2-dev libgtk2.0-dev \
                libnotify-dev libglib2.0-dev libevent-dev \
                wget \
                time
RUN apt-get -y install checkinstall

RUN apt-get -y install libmp3lame-dev

RUN wget https://www.ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2
RUN tar jxvf ffmpeg-snapshot.tar.bz2
RUN cd ffmpeg && \
    ./configure --prefix=/usr --enable-gpl --enable-libmp3lame --enable-shared && \
    time make -j 8 && \
    cat RELEASE && \
    checkinstall
RUN dpkg --install ./ffmpeg/ffmpeg_*.deb

RUN apt-get -y install git
RUN apt-get -y install curl

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get -y install npm
RUN apt-get -y install nodejs

WORKDIR /usr/src/app

RUN git clone https://github.com/inAudible-NG/tables
RUN git clone https://github.com/KrumpetPirate/AAXtoMP3

COPY package*.json ./

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

RUN apt-get -y install bc

EXPOSE 8081 8087

# Bundle app source
COPY . .

CMD ["node", "server.js"]





