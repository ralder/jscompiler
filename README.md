# jscompiler
Следит за изменением файлов (по маске *-dev.js) и компилит их с помощью google-closure-compiler (показывает нотификации, а также варнинги с помощью [jshint](http://jshint.com/docs/options/)

## для установки нужны
- java 1.8+
- nodejs 6.x+
- git (необязательно)
- svn

для показа нотификации требования следующие
- Mac OS X: >= 10.8 or Growl if earlier.
- Linux: notify-osd or libnotify-bin installed (Ubuntu should have this by default)
- Windows: >= 8, task bar balloon if earlier or Growl if that is installed.
- General Fallback: Growl

## установка на windows
1. устанавливаем [nodejs](https://nodejs.org/en/download/current/) 
2. устанавлеваем [java](https://java.com/ru/download/)
3. устанваливаем git (можно установить с коносолью [cmder](http://cmder.net/) - опция `download full`)
4. `git clone https://github.com/ralder/jscompiler`
5. `cd jscompiler`
6. `npm install`
7. `cp config.js.sample config.js`
8. если устанавливать в папку с проектом то config.js можно не править, иначе нужно в параметре watchFiles прописать абсолютный путь

## установка на ubuntu или debian
1. `curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -`
2. `sudo apt-get install nodejs`
3. если нет java (https://www.digitalocean.com/community/tutorials/java-ubuntu-apt-get-ru) 
4. `sudo apt-get install git subversion` (возможно уже установленны)
5. `git clone https://github.com/ralder/jscompiler`
6. `cd jscompiler`
7. `npm install`
8. `cp config.js.sample config.js`
9. если устанавливать в папку с проектом то config.js можно не править, иначе нужно в параметре watchFiles прописать абсолютный путь

## запуск
- из папки jscompiler `node index.js`
- или из папки выше `node jscompiler`
(по-умолчанию режим дебага включен в config.js - если все работает можно потом выключить)

## производительность
- работает быстрее стандартного compiler.jar за счет запущеннго http cервера с бекэндом в виде google-closure-compiler, но из-за этого жрет 100-350MB ОЗУ
