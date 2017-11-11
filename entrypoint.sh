#!/bin/bash

npm install

service postfix restart
wait ${!}

# Update ES_HOST_ADDRESS if required
sed -i.bak 's~ES_HOST_ADDRESS~'$ES_HOST_ADDRESS'~g' package.json
rm package.json.bak

npm start
