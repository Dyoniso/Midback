#!/bin/bash

clear
cd ./templades
cat banner.txt
cd ../

CONFIG_MASTER_PASSWORD="admin"

echo "Do upgrade packages? [RECOMMENDED] (y,n)"
read answerDemp

if [ "$answerDemp" == "y" ]; then
    apt update -y && apt upgrade -y
fi

echo "Do you want to install recommended dependencies? (y,n)"
read answerDemp

if [ "$answerDemp" == "y" ]; then
    echo "Installing dependencies (Node js, Postgresql, Nginx, ffmpeg)"
    apt install openssl -y && apt install ufw -y && apt install postgresql -y && apt install ufw -y && apt install goaccess -y && apt install -y nginx && apt install -y ffmpeg
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
    apt update -y
    apt install -y nodejs && apt install npm -y
    echo "[OK] Dependencies installed!"
    echo ""

fi

echo "Info: To avoid errors, do not create a password with the special characters: '|'"
echo "This will be the server and database password. You can change it in the node's .env settings"
echo "Choose a server password. (Default: '$CONFIG_MASTER_PASSWORD')"
read CONFIG_MASTER_PASSWORD

echo ""
echo "All ready to install. Do you want to continue the installation? (y,n)"
read answerConfirm

if [ "$CONFIG_MASTER_PASSWORD" == "" ]; then
    CONFIG_MASTER_PASSWORD="admin"
fi

if [ "$answerConfirm" == "y" ]; then
    echo "Installing node modules"
    cd ../
    npm install
    echo "[OK] Node modules installed!"

    echo "Generating RS256 Keyset"
    mkdir security
    ssh-keygen -t rsa -P "" -b 4096 -m PEM -f ./security/jwtRS256.key
    openssl rsa -in ./security/jwtRS256.key -pubout -outform PEM -out ./security/jwtRS256.key.pub
    echo "[OK] Keys have been saved in folder: './security'"

    cd ./deploy/templades

    sed -i "s|X_ADMIN_PASSWORD|$CONFIG_MASTER_PASSWORD|gi" node-env.conf
    echo "Node env updated!"

    mkdir ./temp
    cp midback.service ./temp/midback.service && cp nginx-proxy.conf ./temp/nginx-proxy.conf && cp node-env.conf ./temp/node-env.conf
    cd ./temp

    mv node-env.conf .env
    mv .env ../../../.env

    echo "Setting up postgresql database"
    sudo -i -u postgres psql -c "ALTER USER postgres PASSWORD '$CONFIG_MASTER_PASSWORD';"
    sudo -i -u postgres createdb Midback
    ufw allow from any to any port 5432 proto tcp
    systemctl restart postgresql
    echo "[OK] Postgresql configured!"

    echo "Setting up nginx config"
    mv nginx-proxy.conf midback
    cp midback /etc/nginx/sites-available/default
    mv midback /etc/nginx/sites-enabled/default
    cp -r ../../../../Midback /var/www/midback
    ufw allow 80
    systemctl restart nginx
    echo "[OK] Nginx configured!"

    echo "Setting up Midback App"
    mv midback.service /etc/systemd/system/midback.service
    systemctl enable midback.service && systemctl start midback.service
    
    cd ../
    rm -rf ./temp

    echo "_________________________________________"
    echo ""
    echo "Midback successfull deployed! Thanks for choosing"
    echo "Node-Server listen: 127.0.0.1:5000"
    echo "PG-Server listen: 127.0.0.1:5432"
    echo "Nginx Proxy listen: [::]:80"
    echo "Postgresql and Midback-Admin password: $CONFIG_MASTER_PASSWORD"
    echo ""
fi


