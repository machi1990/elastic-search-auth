About this project
==================
Adds an authentication layer for Elasticsearch database.
The implementation assumes that your Elasticsearch cluster is protected by a firewall.
In this way, all request to the cluster passes by this middleware where all access control are verified. 

See "backend-config" field of the "package.json" file to see how to configure this server.

TODO
====
1) Unit tests.

2) Adds more authorization types - current supported are ldap authentication and a local implentation. The later is based on the user index which is automatically created on the target Elasticsearch cluster.

3) Automatically backing up of cluster (Cluster snapshots)

4) Use inversifyJs (http://inversify.io/) for IOC (DI done nicely)and TypeScript's strong typing. This is on going on this branch (https://github.com/machi1990/elastic-search-auth/tree/ftr-ioc-wc-inversifyjs).

CONTACT
======
Manyanda Chitimbo <manyanda.chitimbo@gmail.com>

