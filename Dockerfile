FROM debian:jessie

RUN apt-get -y update
RUN apt-get -y install yasm nasm \
                build-essential automake autoconf \
                libtool pkg-config libcurl4-openssl-dev \
                intltool libxml2-dev libgtk2.0-dev \
                libnotify-dev libglib2.0-dev libevent-dev \
                wget \
                checkinstall \
                time
RUN wget https://www.ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2
RUN tar jxvf ffmpeg-snapshot.tar.bz2
RUN cd ffmpeg && \
    ./configure --prefix=/usr && \
    time make -j 8 && \
    cat RELEASE && \
    checkinstall
RUN dpkg --install ./ffmpeg/ffmpeg_*.deb

RUN apt-get -y install git
RUN apt-get -y install npm
#RUN apt-get -y install nodejs

#RUN echo "deb http://www.deb-multimedia.org jessie main non-free" >> /etc/apt/sources.list
#RUN echo "deb-src http://www.deb-multimedia.org jessie main non-free" >> /etc/apt/sources.list
#RUN echo "deb http://httpredir.debian.org/debian/ jessie-backports main" >> /etc/apt/sources.list
#RUN apt-get update -oAcquire::AllowInsecureRepositories=true
#RUN apt-get install deb-multimedia-keyring
#RUN apt-get update -oAcquire::AllowInsecureRepositories=true
#RUN apt-get install ffmpeg

#RUN apt-get install git
#RUN apt install bash
#RUN apt-get install file
#RUN apt-get install glibc

WORKDIR /usr/src/app

RUN git clone https://github.com/inAudible-NG/tables

COPY package*.json ./

# Install latest stable version
#RUN npm cache clean
#RUN npm install -g n
#RUN n stable

RUN npm install

EXPOSE 8081

RUN apt-get -y install curl

# Bundle app source
COPY . .

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

#CMD ["sleep", "1000"]
CMD ["node", "server.js"]





