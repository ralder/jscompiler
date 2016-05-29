'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const isWin = require('os').platform() == 'win32';

const watch = require('gulp-watch');
const iconv = require('iconv-lite');
const compilerServerStart = require('./cc-runner/');
const jshint = require('jshint').JSHINT;
const svn = require('node-svn-ultimate');
const notifier = require('node-notifier');
const colors = require('chalk');

const OPTIONS = require(path.resolve(__dirname,  './config.js'));

const debug = !OPTIONS.debug ? function() {} : (() => {
    let startTime = Date.now();
    return (...args) => {
        const fromStart = Date.now() - startTime;
        process.stdout.write('[DEBUG # ' + fromStart + ' ms] ');
        const preparedArgs = args.map(arg => {
            return typeof arg === 'object' ? util.inspect(arg, false, null) : arg;
        });
         
        console.log.apply(null, preparedArgs);
    };
})();

const compiler = compilerServerStart(OPTIONS.server);

loadExterns(OPTIONS);

let jshintErrors = {};

compiler.on('listening', () => {
    checkServerStatus(compiler);

    const absWatchFiles = path.resolve(__dirname, OPTIONS.watchFiles);
    debug(`Watch dir: ${absWatchFiles}`);

    watch(absWatchFiles, {verbose: OPTIONS.debug, events: ['change', 'add']}, (file) => {
        if (!file.isBuffer()) {
            alert('error', 'Unhandled error - no file buffer');
            return;
        }

        const compiledFilename = file.path.replace.apply(file.path, OPTIONS.renameRegex);

        checkIsMineChanges(file.path, compiledFilename, () => {
            console.log('----------------------------------------------------------');

            const code = iconv.decode(file.contents, 'win1251');
            const compileOptions = Object.assign(OPTIONS.gcc, {
                sources: [{
                    fileName: compiledFilename,
                    code: code
                }]
            });

            compiler.compile(compileOptions, onCompile.bind(null, compiledFilename));

            jshint(code, OPTIONS.jshint.config, OPTIONS.jshint.globals);
            jshintErrors[path.basename(compiledFilename)] = jshint.errors;
        });
    });
});

process.on('uncaughtException', function (err) {
    alert('error', `UncaughtException: ${err}`);
    process.exit(1);
});

process.on('exit', () => {
    console.log('Bye!');
    compiler.kill();
    process.exit();
});

function onCompile(newFileName, error, res) {
    if (error) {
        alert('error', error);
        return;
    }

    if (!res.result.success) {
        if (res.result.errors) {
            res.result.errors.forEach((error, index) => alert('error', error, index == 0));
        } else {
            console.error('UNHANDLED ERROR');
        }
        return;
    }

    fs.writeFile(newFileName, iconv.encode(res.source, 'win1251'), (err) => {
        if (err) {
            alert('error', `Error save file -  ${err}`);
            throw err;
        }

        const message = 'File compiled: ' + path.basename(newFileName);
        const hints = jshintErrors[path.basename(newFileName)] || [];
        const countWarnings  = res.result.warnings.length + hints.length;

        if (countWarnings) {
            alert('success-warnings', `${message}\nWith warnings (${countWarnings})`);
        } else {
            alert('success', message);
        }

        res.result.warnings.forEach(warning => alert('warning', warning, res.result.warnings.length === 1));
        hints.forEach(hint => {
            if (hint) {
                const msg = hint.reason + `  ${hint.line}:${hint.character} \n In line: ${hint.evidence}`;
                alert('warning', msg, false);
            }
        });

        delete jshintErrors[path.basename(newFileName)];
        delete res.source;
    });
}

function formatMessage(error) {
    const errFile = path.basename(error.sourceName);
    return error.description + (errFile ? `\nFile: ${errFile} ${error.lineNumber}:${error.charno}` : '');
}

function alert(type, message, showNotify = true) {
    if (message.description) {
        message = formatMessage(message);
    }

    const nowTime = String(new Date()).match(/\d+:\d+:\d+/).shift();
    const msgObj = OPTIONS.notification[type];

    console.log(colors[msgObj.color](`[${msgObj.consoleTitle}]`) + ` (${nowTime}) ${message}\n`);

    if (OPTIONS.enableNotify && showNotify) {
        if (isWin) {
            message = message.replace(/\n/, ' ');
        }

        const notifyOptions = Object.assign(msgObj.notify, { message: message });
        notifyOptions.icon = path.resolve(__dirname, notifyOptions.icon);
        notifier.notify(notifyOptions);
    }
}

function checkIsMineChanges(sourceFile, compiledFile, callback) {
    if (!OPTIONS.checkSVN) {
        callback();
        return;
    }

    debug('check SVN status of file %s', path.basename(sourceFile));

    svn.commands.status(sourceFile, (err, svnObj) => {
        if (err) {
            alert("error", "unhandled svn error");
            console.log(err);
            return;
        }

        debug('received SVN status of %s is ', path.basename(sourceFile), svnObj);

        if (isMineChanges(svnObj)) {
           callback();
        } else if (compiledFile) {
            checkIsMineChanges(compiledFile, null, callback);
        } else {
            debug('file changed by svn');
        }
    });
}

function isMineChanges(svnObj) {
    return (svnObj.target.entry &&
           ((svnObj.target.entry['wc-status'].$.item in {modified:1, unversioned:1}) ||
           (svnObj.target.entry['wc-status'].$.item == 'added' && svnObj.target.entry['wc-status'].$.revision == -1)));
}

function checkServerStatus(server) {
    server.status((error, res) => {
        if (error) {
            throw error;
        } else {
            console.log('SERVER GCC STARTED', res);
        }
    });
}

function loadExterns(options) {
    if (options.gcc && options.gcc.externs) {
        //rewrite it in options
        options.gcc.externs = options.gcc.externs.map(filename => {
            const content = fs.readFileSync(path.resolve(__dirname, filename), {encoding: 'UTF-8'});
            debug('loaded extern file %s size %d bytes', filename, content.length);
            return { fileName: filename, code: content };
        });
    } else {
        debug('Externs not found in config');
    }

}
