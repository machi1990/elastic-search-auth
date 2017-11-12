FROM ubuntu:16.04

MAINTAINER Manyanda Chitimbo <manyanda.chitimbo@gmail.com>

ENV ES_HOST_ADDRESS http://10.1.1.185:9200/

COPY bin /root/bin
COPY build /root/build

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
