![alt text](https://github.com/Dyoniso/Midback/blob/master/public/assets/final_image.png?raw=true)

# 7Retro Engine - Midback Relative 2D Imageboard

Preview Video:

[![IMAGE ALT TEXT HERE](https://github.com//Dyoniso/Midback/blob/3.2/public/assets/MidPreview.jpg?raw=true)](https://www.youtube.com/watch?v=dq_5pX_fdbQ)

Midback is an imageboard that only accepts images as a form of posting, it was designed with the following objectives

1. Support users who don't use javascript
2. Easy and practical code customization
3. Front-end with modular technology for greater compatibility
4. Easy instalation
5. File Buffer Optimization

# Required dependencies
* [Node.js](http://nodejs.org)
* [Postgresql 10](https://www.postgresql.org)
* [ffmpeg](https://ffmpeg.org/)

# Instalation
The entire system has only been tested on [Ubuntu Server LTS 18.04](https://releases.ubuntu.com/18.04/), if there is any deployment error,
create a new topic and inform the server version and error details.

Midback is designed for quick and easy installation.
On a newly created linux server, run the script in the deployment folder

Clone the Midback repository:
```
git clone https://github.com/Dyoniso/Midback
```
With the cloned repository, enter the deploy folder:
```
cd ./Midback/deploy/
```
Set permission and run the setup script:
```
chmod 777 setup.sh
./setup.sh
```
For more information [see this video](https://www.youtube.com/watch?v=7oONH93n_Bo&ab_channel=7RetroEngine).

The install script will configure all dependencies, database and nginx proxy automatically.
You can also choose manual installation, see more on the [wiki](https://github.com/Dyoniso/Midback/wiki)

# Copyright
Dyoniso - Copyright © Midback 2021

# Donate
https://www.patreon.com/dyoniso

# License
Licensed under the [WTFPL License](http://www.wtfpl.net/).
