#!/bin/bash

# Force run as root
if [ $(id -u) != "0" ]
    then
        sudo "$0" "$@"
        exit $?
fi

# Installations
# ===============

# Introduce new repositories
apt-add-repository -y ppa:vbernat/haproxy-1.5
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list
add-apt-repository -y ppa:rwky/redis
apt-get -y update

# Helpers
apt-get -y install python-pip
pip install docopt

exit 1 # TODO: For test purpose. Remove it later.

# NodeJs
apt-get -y install nodejs
apt-get -y install npm
npm install gulp -g
mkdir -p /var/log/nodejs
ln -sfv /usr/bin/nodejs /usr/bin/node

# Install project npms
pushd .
cd ../..
PROJECT_PATH=$(pwd)
npm install
gulp build
gulp product
popd
echo "Project path:"
echo $PROJECT_PATH

# Nginx
apt-get -y install nginx
# Haproxy
apt-get -y --force-yes install haproxy
# MongoDB
# Fix Failed global initialization: BadValue Invalid or no user locale set.
# Please ensure LANG and/or LC_* environment variables are set correctly.
apt-get -y install language-pack-en
export LANGUAGE=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
locale-gen en_US.UTF-8
dpkg-reconfigure locales
# Remove the old mongo
apt-get -y remove mongodb* --purge
apt-get -y autoremove
# Install mongo
apt-get -y install mongodb-org
# Fix mongo version
echo "mongodb-org hold" | sudo dpkg --set-selections
echo "mongodb-org-server hold" | sudo dpkg --set-selections
echo "mongodb-org-shell hold" | sudo dpkg --set-selections
echo "mongodb-org-mongos hold" | sudo dpkg --set-selections
echo "mongodb-org-tools hold" | sudo dpkg --set-selections

# For mongodb user increase various limits
python ../helpers/conf_append.py --file=/etc/security/limits.conf --key="#Mongodb User Limits" \
--append=" \
mongodb soft fsize -1 \n \
mongodb hard fsize -1 \n \
mongodb soft cpu   -1 \n \
mongodb hard cpu   -1 \n \
mongodb soft as    -1 \n \
mongodb hard as    -1 \n \
mongodb soft nofile 64000 \n \
mongodb hard nofile 64000 \n \
mongodb soft nproc  64000 \n \
mongodb hard nproc  64000 \n"

# Generate the initial mongo data set
pushd .
cd ./mongodb_slave/
. init.sh
popd
# Redis
apt-get -y install redis-server

# Haproxy conf setup
/etc/init.d/haproxy stop
mv -fv /etc/init.d/haproxy ~ #  Haproxy is controlled by upstart
cp -fv ./haproxy/haproxy.cfg /etc/haproxy

# Nginx conf setup
/etc/init.d/nginx stop
cp -fv ./nginx/nginx-* /etc/nginx/sites-available
cp -fv ./nginx/nginx.conf /etc/nginx
rm -Rfv /etc/nginx/sites-enabled/*
ln -sfv /etc/nginx/sites-available/nginx-node2 /etc/nginx/sites-enabled/nginx-node2
python ../helpers/auto_replace.py --file=/etc/nginx/sites-available/nginx-node2 \
                                  --search="#AUTO_REPLACE_PR_PATH" \
                                  --replace=$PROJECT_PATH

mv -fv /etc/init.d/nginx ~ #  Nginx is controlled by upstart

# Redis conf setup
mkdir -p /var/log/redis
cp -fv ./redis/*.conf /etc/redis
chown redis:redis /etc/redis/*.conf

# Copy upstart files
cp -fv ./upstart/* /etc/init
python ../helpers/auto_replace.py --file=/etc/init/nodejs-instance.conf \
                                  --search="#AUTO_REPLACE_COOKIE_SECRET" \
                                  --replace="42rerwejfkj9434cds5ewejd"
python ../helpers/auto_replace.py --file=/etc/init/nodejs-instance.conf \
                                  --search="#AUTO_REPLACE_PR_PATH" \
                                  --replace=$PROJECT_PATH

initctl reload-configuration