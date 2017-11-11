FROM ubuntu:16.04

MAINTAINER Manyanda Chitimbo <manyanda.chitimbo@gmail.com>

ENV ES_HOST_ADDRESS http://10.1.1.185:9200/

COPY utils /root/utils
COPY bin /root/bin
COPY routes /root/routes

COPY app.js /root/app.js
COPY init.js /root/init.js
COPY setup.js /root/setup.js
COPY package-prod.json /root/package.json
COPY entrypoint.sh /root/entrypoint.sh
RUN chmod +x /root/entrypoint.sh

RUN apt-get -y update && apt-get upgrade -y
RUN apt-get install -y curl python postfix
RUN apt-get remove --purge nodejs npm
RUN curl -sL https://deb.nodesource.com/setup_7.x | bash -
RUN apt-get -y update
RUN apt-get -y install nodejs
RUN apt-get -y install build-essential

# Clean up system
RUN apt-get clean
RUN rm -rf /tmp/* /var/tmp/*
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /root
EXPOSE 3000
ENTRYPOINT ["/root/entrypoint.sh"]

#CMD ['node']
