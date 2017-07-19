"use strict"
const PATH = require('path');
const FS = require('fs');
const PROCESS = require( "process" );
const READLINE = require('readline');
const HTTP = require('http');
var ROOT_PATH = process.mainModule.paths[0].split('node_modules')[0].slice(0, -1);
var SAVED_PATH = PATH.join(ROOT_PATH, '.packConf/saveInfo');
var CONF_MAP = PATH.join(ROOT_PATH, 'confMap.json');

let rl = READLINE.createInterface({
    input: PROCESS.stdin,
    output: PROCESS.stdout
});

function recursiveReadFile (folderName, ignoreList) {
    var folderList = [];
    var fileList = [];
    var ignoreList = ignoreList || [];
    folderList.push(folderName);
    do {
        var folder = folderList.shift(); 
        var files = FS.readdirSync(folder);
        files.forEach(file => {
            var fileWithPath = PATH.join(folder, file);
            var stats = FS.statSync(fileWithPath); 
            if (~ignoreList.indexOf(file)) {
                return;
            } else if (stats.isDirectory()) {
                //at this time file refers to folder
                folderList.push(folder + '/' + file);
            } else {
                fileList.push(fileWithPath);
            }
        });
    } while (folderList.length);
    return fileList;
}
function recursiveGenerator (folderName, config) {
    var fileList = recursiveReadFile(folderName, ['config.json', 'config-version.json'].concat(configFile.globalIgnoreList));
    fileList.forEach(fileWithPath => {
        var hash = MD5.sync(fileWithPath);
        config.files[PATH.relative(BUILD_PATH, fileWithPath)] = hash;
    });
}
function ensureDirectoryExistence(filePath) {
  var dirname = PATH.dirname(filePath);
  if (FS.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  FS.mkdirSync(dirname);
}
function writeFile (path, jsonFile, isJSON = true) {
    ensureDirectoryExistence(path);
    FS.writeFileSync(path, isJSON ? JSON.stringify(jsonFile,null,4).replace(/\\\\/g,'/'): jsonFile);
}
function stringifyJSON (jsonFile) {
   return JSON.stringify(jsonFile,null,4).replace(/\\\\/g,'/') 
}

function readJSONFile (file) {
    return JSON.parse(FS.readFileSync(file, 'utf8'));
}

function writeJSFile (fileWithPath, json, type) {
    if (type === 'es6') {
        writeFile(fileWithPath, 'export default ' + stringifyJSON(json), false);        
    } else {
        writeFile(fileWithPath, 'module.exports = ' + stringifyJSON(json), false);
    }

}
var exports = {
    initConf () {
        var reponame = '';
        rl.question('>>> 正在生成confmap...\nproceed or not, type yes/no\n', answer => {
            if (answer !== 'yes') {rl.close(); return;}
            var confMap = {
                "env1": {
                    "param": 1
                },
                "env2": {
                    "param": 2
                },
                "env3": {
                    "param": 3
                },
            };
            console.log('================================================\n', JSON.stringify(confMap, null, 4));
            rl.question('does it looks good to you? yes/no\n', answer => {
                if (answer === 'yes') {
                    writeFile(CONF_MAP, confMap);
                    console.log('confMap.json file success created!');
                } else {
                    console.log('exit. please reinit');
                    rl.close();
                    return;
                }
                rl.question('where do wish to save you conf file ?\n', path => {
                    var fileWithPath = PATH.join(ROOT_PATH, path);

                    rl.question('cmd or es6 import? cmd/es6\n', answer => {
                        writeJSFile(fileWithPath, confMap['env1'], answer);
                        writeFile(SAVED_PATH, {path: path, type: answer});
                        rl.close();
                    })
                });
            });
        });
    },
    run () {
        if (!FS.existsSync(SAVED_PATH)) {
            console.log('you did NOT init confMap yet, exit')
            rl.close();
            return;
        }
        var saveInfo = readJSONFile(SAVED_PATH);
        var confMap = readJSONFile(CONF_MAP);
        console.log(JSON.stringify(confMap, null, 4));
        rl.question('>>> which type of config file do you wish to create based on confMap.json?', answer => {
            var conf = confMap[answer];
            if (!conf) {
                console.log('no such config file exits, exit')
                rl.close();
                return;
            }
            writeJSFile(PATH.join(ROOT_PATH, saveInfo.path), conf, saveInfo.type);
            console.log('success');
            rl.close();
        });

    }
};

module.exports = exports;

