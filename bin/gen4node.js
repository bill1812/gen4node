#!/usr/bin/env node

var ejs = require('ejs');
var fs  = require('fs');
var minimatch = require('minimatch');
var mkdirp = require('mkdirp');
var path   = require('path');

/* modified version built-in @\gen4node\bin\commander.js */
var program  = require('./commander');

var readline = require('readline');
var sortedObject = require('sorted-object');
var util   = require('util');
var semver = require('semver');

var MODE_0666 = parseInt('0666', 8);
var MODE_0755 = parseInt('0755', 8);
var TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
var VERSION = require('../package').version;

var _exit = process.exit;

// Re-assign process.exit because of commander
// TODO: Switch to a different command framework
process.exit = exit;

// CLI
around(program, 'optionMissingArgument', function (fn, args) {
  program.outputHelp();
  fn.apply(this, args);
  return { args: [], unknown: [] };
});

before(program, 'outputHelp', function () {
  // track if help was shown for unknown option
  this._helpShown = true;
});

before(program, 'unknownOption', function () {
  // allow unknown options if help was shown, to prevent trailing error
  this._allowUnknownOption = this._helpShown;

  // show help if not yet shown
  if (!this._helpShown) {
    program.outputHelp();
  }
});

program
  .name('gen4node')
  .version(VERSION, '    --version')
  .usage('[options] [dir]')
  .option('    --ejs', 'add ejs engine support', renamedOption('--ejs', '--view=ejs'))
  .option('    --pug', 'add pug engine support', renamedOption('--pug', '--view=pug'))
  .option('    --hbs', 'add handlebars engine support', renamedOption('--hbs', '--view=hbs'))
  .option('    --hogan', 'add hogan.js engine support', renamedOption('--hogan', '--view=hogan'))
  .option('    --view <engine>', 'add view <engine> support (dust|ejs|hbs|hjs|jade|pug|twig|vash) (defaults to pug)')
  .option('-X, --no-view', 'use static html instead of view engine')
  .option('    --css <engine>', 'add stylesheet <engine> support (less|stylus|compass|sass) (defaults to plain css)')
  .option('-g, --git', 'add .gitignore')
  .option('-t, --test', 'add mocha support')
  .option('    --watch <type>', 'add [nodemon] support')  /* from github.com/remy/nodemon */
  .option('-w, --no-watch', 'without nodemon support')
  .option('-f, --force', 'force on non-empty directory');
//  .parse(process.argv);

if (semver.gte(process.version, '6.0.0')) {
  program.option('    --es6', 'use ES6 (ES2015) language features');
}
program.parse(process.argv);

/// concept from github.com/tj/commander.js/blob/v2.19.0/examples/pizza
var nodemon = true === program.watch ? 'nodemon' : program.watch || 'no';
//  console.log('nodemon: ' + nodemon);

if (!exit.exited) {
  main();
}

/** Install an around function; AOP. */
function around(obj, method, fn) {
  var old = obj[method];

  obj[method] = function () {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.call(this, old, args);
  };
}

/** Install a before function; AOP. */
function before(obj, method, fn) {
  var old = obj[method];

  obj[method] = function () {
    fn.call(this);
    old.apply(this, arguments);
  };
}

/** Prompt for confirmation on STDOUT/STDIN */
function confirm(msg, callback) {
  var rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question(msg, function (input) {
    rl.close();
    callback(/^y|yes|ok|true$/i.test(input));
  });
}

/** Copy file from template directory. */
function copyTemplate(from, to) {
  write(to, fs.readFileSync(path.join(TEMPLATE_DIR, from), 'utf-8'));
}

/** Copy multiple files from template directory. */
function copyTemplateMulti(fromDir, toDir, nameGlob) {
  fs.readdirSync(path.join(TEMPLATE_DIR, fromDir))
    .filter(minimatch.filter(nameGlob, { matchBase: true }))
    .forEach(function (name) {
      copyTemplate(path.join(fromDir, name), path.join(toDir, name));
    });
}
//console.log('program.watch: ' + program.watch);
/**
 * Create application at the given directory.
 *
 * @param {string} name
 * @param {string} dir
 */
function createApplication(name, dir) {
  console.log();

  // Package
  var pkg = {
    author: {
      'name': 'NAME',
      'email': 'NAME@users.noreply.github.com'
    },
    bin: '',
    bugs: {
      'url': 'https://github.com/ACCOUNT/project/issues'
    },
    bundleDependencies: false,
    dependencies: {
      'debug': '^4.1.0'
    },
    deprecated: false,
    description: 'Express Skeleton Website',
    devDependencies: {
//    'nodemon': '^1.18.9'
    },
    directories: {
      'bin': './bin',
      'public': './public',
      'routes': './routes'
    },
    engines: {
      'node': '>=8.12.0'
    },
    files: [
      'LICENSE.md',
      'README.md'
    ],
    homepage: 'https://github.com/ACCOUNT',
    keywords: [
      'gen4node',
      'node'
    ],
    license: 'UNLICENSED',
    main: '',
    name: name,
    private: true,
    repository: {
      'type': 'git',
      'url': 'git://github.com/ACCOUNT/project.git'
    },
    scripts: {
//    start: 'node ./bin/www',
//    devstart: 'nodemon ./bin/www'
    },
    version: '0.0.0'
  };
  /// 
  if (nodemon === 'nodemon') {
    pkg.devDependencies = { 'nodemon': '^1.18.9' };
    pkg.scripts = { 'start': 'node ./bin/www', 'devstart': 'nodemon ./bin/www' };
  } else {
    pkg.scripts = { 'start': 'node ./bin/www' };
  }

  // JavaScript
  var app = loadTemplate('js/app.js');
  var www = loadTemplate('js/www');

  // App name
  www.locals.name = name;

  /*! ES6 support 00:53 16-Nov-2018 */
  var varconst = program.es6 ? 'const' : 'var';
  var letVar   = program.es6 ? 'let' : 'var';
  www.locals.es6 = program.es6;
  www.locals.varconst = varconst;
  app.locals.es6 = program.es6;
  app.locals.varconst = varconst;
  app.locals.letVar   = letVar;

  var genFunc = null;
  if (program.es6) {
    genFunc = function (params) {
      return '(' + params.join(', ') + ') =>';
    };
  } else {
    genFunc = function (params) {
      return 'function (' + params.join(', ') + ')';
    };
  }
  app.locals.genFunc = genFunc;
  www.locals.genFunc = genFunc;
  /*! end of ES6 */

  // 23:23 07-Nov-2018 TEST
  www.locals.localModules  = Object.create(null);
  www.locals.exportModules = Object.create(null);
  www.locals.modules = Object.create(null);
  www.locals.comfort = [];
  www.locals.uses    = [];

  // How about: process.env.xframeorigin = 'deny' || 'sameorigin' || 'allow-from'
  www.locals.exportModules.xframeorigin = "'sameorigin'; // 'deny', [sameorigin], 'allow-from'";

  www.locals.modules.app = '../app';
  www.locals.modules.http = 'http';

  www.locals.comfort.push('LOCALAPPDATA');
  www.locals.comfort.push('NODE_DEBUG');
  www.locals.comfort.push('NODE_ENV');
  www.locals.comfort.push('PORT');
  www.locals.comfort.push('USERPROFILE');
  www.locals.comfort.push('HOMEDRIVE');
  www.locals.comfort.push('HOMEPATH');
  www.locals.comfort.push('DEBUG');
  www.locals.comfort.push('DEBUG_COLORS');
  www.locals.comfort.push('DEBUG_HIDE_DATE');
  www.locals.comfort.push('DEBUG_DEPTH');
  www.locals.comfort.push('DEBUG_SHOW_HIDDEN');
  www.locals.comfort.push('TEMP');
  www.locals.comfort.push('windir');
  www.locals.comfort.push('NODE_DEBUG_NATIVE');
  www.locals.comfort.push('NODE_DISABLE_COLORS');
  www.locals.comfort.push('NODE_EXTRA_CA_CERTS');
  www.locals.comfort.push('NODE_NO_WARNINGS');
  www.locals.comfort.push('NODE_OPTIONS');
  www.locals.comfort.push('NODE_PATH');
  www.locals.comfort.push('OPENSSL_CONF');
  // end of TEST

  // App modules
  app.locals.localModules  = Object.create(null);
  app.locals.localVariable = Object.create(null);
  app.locals.localLetVar   = Object.create(null);
  app.locals.modules = Object.create(null);
  app.locals.mounts  = [];
  app.locals.uses    = [];

// 23:23 08-Nov-2018 TEST

  // Local variables
  app.locals.localVariable.app = "express()";

  // Local LET variables
  app.locals.localLetVar.mimeTIE = "'text/html'";

  // Path
  app.locals.modules.path = 'path';

  // Variable Exports
  app.locals.modules.xfo = "./bin/www";

  // Express
  app.locals.modules.express = 'express';
//app.locals.uses.push('');
  pkg.dependencies['express'] = '^4.16.4';

  // Error Handle
  app.locals.modules.createError = 'http-errors';
//app.locals.uses.push('');
  pkg.dependencies['http-errors'] = '^1.7.1';

// end of TEST

  // Compression
  app.locals.modules.compression = 'compression';
  app.locals.uses.push('compression()');
  pkg.dependencies['compression'] = '^1.7.3';

  // Mime Type
  app.locals.modules.mimetype = 'mime-types';
  pkg.dependencies['mime-types'] = '^2.1.21';

  // Request logger
  app.locals.modules.logger = 'morgan';
  app.locals.uses.push("logger('dev' /* options: immediate, skip, stream, combined, common, [dev], short, tiny */ )");
  pkg.dependencies.morgan = '^1.9.1';

/* serveStatic : use express.static
  app.locals.modules.serveStatic = 'serve-static';
  app.locals.uses.push("serveStatic('public', {\n  'index': ['default.html', 'default.htm'],\n  maxAge: '2h',\n  setHeaders: function (res, path) {\n    if (mimetype.getType(path) === 'text/html') {\n      res.setHeader('Cache-Control', 'public, max-age=7200');\n    } else {\n      res.setHeader('Cache-Control', 'public, max-age=14400');\n    }\n  }\n})");
  pkg.dependencies['serve-static'] = '^1.13.2';
*/
  // Body parsers
  app.locals.uses.push('express.json()');
  app.locals.uses.push('express.urlencoded({ extended: false })');

  // Cookie parser
  // https://stackoverflow.com/questions/16209145/how-to-set-cookie-in-node-js-using-express-framework
  app.locals.modules.cookieParser = 'cookie-parser';
  app.locals.uses.push('cookieParser()');
  if (program.es6) {
    app.locals.uses.push("(req, res, next) => {\n  const cookie = req.cookies.cookieName;\n  if (cookie === undefined) {\n    let randomNumber = Math.random().toString();\n    randomNumber = randomNumber.substring(2, randomNumber.length);\n    res.cookie(\n      'yummyCookie',\n      randomNumber,\n      { maxAge: 0.5 * 60 * 60,\n        httpOnly: true,\n        signed: false,\n        sameSite: true\n      }\n    );\n    console.log(`\\x1b[35m\\x1b[1m`, ` cookie: ` + randomNumber, `\\x1b[37m\\x1b[0m`);\n  }\n  next();\n}");
  } else {
    app.locals.uses.push("function (req, res, next) {\n  var cookie = req.cookies.cookieName;\n  if (cookie === undefined) {\n    var randomNumber = Math.random().toString();\n    randomNumber = randomNumber.substring(2, randomNumber.length);\n    res.cookie(\n      'yummyCookie',\n      randomNumber,\n      { maxAge: 0.5 * 60 * 60,\n        httpOnly: true,\n        signed: false,\n        sameSite: true\n      }\n    );\n    console.log('\\x1b[35m\\x1b[1m', ' cookie: ' + randomNumber, '\\x1b[37m\\x1b[0m');\n  }\n  next();\n}");
  }
  pkg.dependencies['cookie-parser'] = '^1.4.3';
/* 15:42 06-Dec-2018 do we need this anymore?
  // Favicon
  app.locals.modules.favicon = 'serve-favicon';
  app.locals.uses.push("favicon(path.join(__dirname, 'public', 'favicon.ico'))");
  pkg.dependencies['serve-favicon'] = '^2.5.0';
*/
// 23:58 07-Nov-2018 TEST
  // x-frame-options : frameguard
  app.locals.modules.frameguard = 'frameguard';
  app.locals.uses.push("frameguard({\n  action: xfo.xframeorigin //,\n  //domain: '',\n  //domain: '',\n  //domain: '',\n  //domain: ''\n})");
  pkg.dependencies['frameguard'] = '^3.0.0';

  if (dir !== '.') {
    mkdir(dir, '.');
  }

  mkdir(dir, 'public');
  var img = "AAABAAIAEBAAAAAAIABoBAAAJgAAACAgAAAAACAAqBAAAI4EAAAoAAAAEAAAACAAAAABACAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAAAAA////Af///wH///8B////Af///wH///8BPIc+RUSOSNVlrXfTYqdxRf///wH///8B////Af///wH///8B////Af///wH///8B////Af///wE9hz4hPIY+rTyFPf9apWn/Za13/2Kncf9eoWmrWZpiIf///wH///8B////Af///wH///8B////AT2JPws9hj6JPYY+/T2GPv9Gkk3/ZbN6/2Wtd/9jp3H/XqFp/1aYX/1LkFCJQohDC////wH///8B////ATyFPVc9hj7pPYY+/z2GPv88hDz/W65w/2Syef9lrXf/Y6dx/16haf9WmF//So9O/z6GP+c9hj5X////AUCwVglBl0v9PYU9/z2GPv89hj7/SJdS/2G2e/9ksnn/Za13/2Oncf9eoWn/Vphf/0qPTv8+hj//P4hB/VeXXwdPqmELUqpk+z6IQP89hj7/PYY+/1q0cf9gtXr/ZLJ5/2Wtd/9jp3H/XqFp/1aYX/9Kj07/PYY+/0mOTvtKj08HVqloC1mnavtQmlr/PIU9/0qfWP9duXf/YLV6/2Syef9lrXf/Y6dx/16haf9WmF//So9O/0KJRP9Jj0/7SI5NB1qjaQtbo2n7W6Jo/0SNSP9XunL/Xbl3/2C1ev9ksnn/Za13/2Oncf9eoWn/Vphf/0qPTv9GjEr/RotH+0SJRQdboWcLWp9m+1qdZP9Vr2v/V7xz/125d/9gtXr/ZLJ5/2Wtd/9jp3H/XqFp/1aYXv9Qk1f/Q4lE/0GIQvtBiEEHWJxjC1iaYftWnWH/UL5w/1e8c/9duXf/YLV6/2Syef9lrXf/Y6dx/16haf9WmF//Wpxk/0uQT/9AhkD7PoVAB1aYXgtUlVz7TbNo/1G+cP9XvHP/Xbl3/2C1ev9ksnn/Za13/2Oncf9eoWn/WZtj/12gaf9eoWr/PYZA+zyGPgdQlVkJTpta+0nBbv9RvnD/V7xz/125d/9gtXr/ZLJ5/2Wtd/9jp3H/XaBo/1ueZ/9fomz/YqZx/0+WV/s+iD8H////AUi1ZVNKv23lUL5v/1e8c/9duXf/YLV6/2Syef9lrXf/Yqdx/1yeZ/9eoWv/YaVw/2Ooc+Nkq3RR////Af///wH///8BS7trCVG9b4FXu3P5Xbl3/2C1ev9ksnn/Za13/2Cjbf9eoGn/YKRu+WGmcX9fpW8H////Af///wH///8B////Af///wH///8BV7pzHV24dqdgtXr/ZLJ5/2Ssdv9doGj/X6JspV+kbhv///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BX7J3P2SxeMlfpW/HXKBoPf///wH///8B////Af///wH///8B////AQAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8oAAAAIAAAAEAAAAABACAAAAAAAIAQAAAAAAAAAAAAAAAAAAAAAAAA////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wE7hjxbP4lB+2WvePljqnNZ////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BP38+A////wE8iT4xPYc+4TqDOv9XomT/Z7B6/2Wsdv9jqHLhYKRuMf///wFcnmgD////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wE4mj4FPYc+rz2GPv89hj7/QYpE/2ezfP9lrnj/Zax2/2SpdP9hpXD/X6JrrVKbWQX///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BPYc+gz2GPv89hj7/PYY+/zqDOv9bqGz/ZrF6/2WueP9lrHb/ZKlz/2KlcP9go2z/XJ9n/1maYoP///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BPYg+Tz2GPvc9hj7/PYY+/z2GPv88hT3/RpFM/2a3fv9lsXn/Za54/2Wsdv9kqXP/YqVw/2Cj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bv9hpXD9Y6dz/2Opc/9iqXOP////Af///wH///8B////Af///wH///8B////AUfAbAP///8BS7trIU+9bsNTvnH/Vrxy/1m8df9cunb/Xrh4/2C3e/9htHr/ZLR6/2Wxef9lrnj/Zax2/2WqdP9eoGr/XJ5o/16haf9go23/YaVv/2Kmcv9ip3G/X6VvHf///wFlq3UD////Af///wH///8B////Af///wH///8B////Af///wH///8B////AVG6bkNWu3HrWbx1/1y6dv9euHj/YLd7/2G0ev9ktHr/ZbF5/2WueP9lrHb/Y6hx/1udZv9eoWn/YKJs/2Ckbv9hpXDnYKVvP////wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wFXunNzXLl1/V65eP9gt3v/YbR6/2S0ev9lsXn/Za54/2Wsd/9doWr/XaBo/2CibP9fo237X6Rubf///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8BXbd2n2C3ev9itHr/ZLR6/2Wxef9lrnj/Yqhx/VyeZ/9fomr/XqFsm////wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////AV69egP///8BW7J1J2CzeNNktHr/ZbF5/2WueP9cn2n/XaBoz1ugaCP///8BYaNwBf///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////AWCxdk1lsHjdYKdw21ibYkf///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////Af///wH///8B////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  var data = img.replace(/^data:image\/\w+;base64,/, "");
  var buf = new Buffer(data, 'base64');
  fs.writeFile('./public/favicon.ico', buf, 'binary', function (err) {});

//  mkdir(dir, 'public/javascripts')
  mkdir(dir, 'public/js');
//  mkdir(dir, 'public/images')
  mkdir(dir, 'public/img');
//  mkdir(dir, 'public/stylesheets')
  mkdir(dir, 'public/css');

  var eri = "AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAABILAAASCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAABkAAAA1AAAAUwAAAG4AAACEAAAAiAAAAHgAAABeAAAAQAAAACMAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAC0AACqFAAA/xgAAUOEAAGHxAABu+gAAdP4AAG37AABe8wAATeYAADrVAAAhvAAAAIIAAABDAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAADicAADiXAABO4A8Tf/8hK53/NUC6/0dWzv9TZN3/Wmrk/1Ji3f9EU87/Mz64/yAonf8PE37/AABL6gAALs4AAAeOAAAAPAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAADRcAABN1xIYhv8nMrD/NEfX/y5D3f8mPt3/HDrd/w853v8AN97/Djjd/xs53P8iO9v/LULc/zRG1/8nMrD/EhiG/wAAR+gAACPCAAAAYQAAABYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAABBfAkMbPIiLKb/LkHW/x0z2f8II9X/ACDX/wAo2v8AL9v/ADXe/wA33v8AM93/ACza/wAk2P8AH9f/CCPV/xwy2f8uQdb/Iiym/wkMavcAADDSAAAAdgAAABsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAARoAPE337Kzi4/yQ52v8LItb/ABnU/wAc1f8AINf/ACXY/wAr2/8AMdz/ADPd/wAw2/8AKdr/ACLX/wAf1/8AHNT/ABnU/wsi1v8kOdr/Kzi4/w8SfPwAADTXAAAAdgAAABYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAEdlDxN9+is5v/8eM9n/ABnU/wAZ1P8CGtT/CCHW/wok1v8DI9j/ACfZ/wAr2/8AK9v/ACra/wAl2P8AINf/BSHW/w0l1v8KItb/AxzV/wAZ1P8dM9n/LDq//w8SfPwAADDSAAAAYQAAAAkAAAAAAAAAAAAAAAAAAAAAAABENQkMbu0rOLj/HjPZ/wAZ1P8AGdT/ABnU/wEZ1P8RKNf/FCvY/wcg1f8FI9j/AiXY/wEl2f8BI9j/ASHY/wUg1v8LI9b/HjXZ/w8m1/8DG9T/AhvU/wAZ1P8eM9n/Kzi4/wkMavcAACPCAAAAPAAAAAAAAAAAAAAAAAAAJgcAAFWyIiym/yQ52v8AGdT/ABnU/wAZ1P8AFNT/DR3U/7G68v+rs/D/DSLW/wAV1P8CHNX/AR3V/wEd1f8BG9T/ABPT/zZJ3v/c4Pn/hZHq/wIP0v8AFNP/ABnU/wAZ1P8kOdr/Iiym/wAAR+gAAAeOAAAAFAAAAAAAAAAAAABORRIYhv8uQdb/CyLW/wAZ1P8AGdT/ABTU/wkYyv+gqu////////////+irPD/ESjX/wAS0/8AGNT/ABfU/wAQ0v8uQ9z/zNH3////////////fIrq/wAQ0v8AFtP/ABnU/wsi1v8uQdb/EhiG/wAALs4AAABDAAAAAAAAAAIAAFiuJzKw/xwy2f8AGdT/ABnU/wAW0f8UILn/qrDg//////////////////////+qs/D/FCvX/wAR0/8AENL/KkDb/8jN9v//////////////////////h5Xu/wke1f8AF9P/ABnU/xwy2f8nMrD/AABL6gAAAIIAAAAKAABNHg0RfP4xQ9f/CCDV/wAZ1P8AGdX/ABTP/xwlr//Ext7///////////////////////////+ttfH/Fy7Y/yU72v/HzPX///////////////////////////+vtOD/DSHS/wAW1P8AGdT/CCDV/zFD1/8NEXz/AAAhvAAAACMAAFZPGyOY/yU62v8AGdT/ABnU/wAZ1P8AGtb/ABDS/w8Vrf+tsNb////////////////////////////Bx/T/y9D2////////////////////////////oKbc/wgVwP8AFdL/ABnV/wAZ1P8AGdT/JTra/xsjmP8AADfVAAAAQAAAW4koM7L/GC7Y/wAZ1P8AGdT/ABnU/wAZ1P8AGtX/ABPS/xEauf+botf/+/z+/////////////////////////////////////////////v7//5ad3P8LGMP/ABTT/wAZ1P8AGdT/ABnU/wAZ1P8YLtj/KDOy/wAASOYAAABeAABfvzJBxv8NJNb/ABnU/wAZ1P8AGdT/DCTW/yo/3P8/Ut//Rljg/zJA0f+fpdr///////////////////////////////////////////+Wnd3/IjDQ/zlN3v82St3/Izna/wsi1v8AGdT/ABnU/w0k1v8yQcb/AABU8wAAAHgAAGHqOUrV/wUd1f8AGdT/ECjX/y9D3P9YaOP/YG/k/1Zn4/9MXuH/P1Hf/xget/+0t93/////////////////////////////////o6nf/xMexv80R93/QVPf/0xe4f9WZ+P/UGHi/zVJ3f8QKNf/BR3V/zlK1f8AAF37AAAAiAAAYvY+T93/ABnU/yQ52v9QYuL/aHfm/2h35v9hcOX/U2Xi/0ha4f88Ttf/aXLX/9vf+f////////////////////////////////+5wPL/OEvd/ztO3v9GWOD/UGHi/1lq4/9iceX/aHfm/1Bi4v8jOdr/Pk/d/wAAYv4AAACEAABh1TlK1f8sQNz/X2/k/2l45v9od+b/aXjm/2R05f9mdub/Y3Ll/4aS6//h5Pr//////////////////////////////////v7///////+3v/P/Wmrj/1do4/9XaOP/XW3k/2R05f9peOb/aXjm/1lp4/85StX/AABd+gAAAG4AAF+iMkHG/1Bh4v9peOb/aXjm/2l45v9peOb/aHfm/2Ny5f+Fker/4OP5/////////////////////////////////////////////v7///////+8wvT/ZHTm/2Nz5f9ldeX/Z3fm/2l45v9peOb/Vmfj/zJBxv8AAFXxAAAAUwAAXmYoM7L/Slzh/2l45v9peOb/aXjm/2l45v9md+n/hJDq/9/h+f///////////////////////////9vb6//c3e3//////////////////v7+//////+7wvT/ZHPl/2Z15f9peOb/aXjm/2l45v9KXOH/KDOy/wAASuEAAAA1AABdLxsjmP9BU9//aXjm/2l45v9peOf/ZnXj/3iC2f/m6v7////////////////////////////R0uf/bHXN/2x1zv/Y2Or////////////////////+///////Izfb/bnzm/2d25v9peOb/aXjm/0FT3/8bI5j/AAA8xgAAABkAAF8JDRF83zpM2f9dbeT/aXjm/2l45/9ndeT/cXrP/8vN5v//////////////////////z9Dl/3B50f9mden/ZHPm/294z//U1ej////////////+/v7//////9XZ+P9wfuf/Z3bm/2p45v9dbeT/OkzZ/w0RfP8AACmFAAAABgAAAAAAAF9pJzKw/0ZY4P9peOb/aXjm/2l45/9kc+X/ZW/O/8bH5P///////////8zN4/9wedH/ZHTm/2h35/9oeOf/YnLk/3B50P/U1ej////////////EyvX/aXfm/2Z15f9peOb/aXjm/0ZY4P8nMrD/AABO4AAAAC0AAAAAAAAAAAAAXxkSGIbnOkzZ/1lp4/9peOb/aXjm/2p55/9jc+X/ZW/O/8zN6P/R0+j/cXrR/2Rz5f9peOf/aHfm/2d25f9oeOf/YnHl/3B5z//i4uv/zNH6/2d25v9kc+X/aXjm/2l45v9ZaeP/OkzZ/xIYhv8AADiXAAAACwAAAAAAAAAAAAAAAAAAX1siLKb/QVPf/2l45v9peOb/aXjm/2p55/9kc+X/cnvR/3R80/9ldeb/aXjn/2l45v9peOb/aXjm/2l45v9peef/Y3Lk/3mD2P9yf+D/ZHTn/2l45v9peOb/aXjm/0FT3/8iLKb/AABN1wAADicAAAAAAAAAAAAAAAAAAAAAAABfCQoNdKArOLj/RVfg/2l45v9peOb/aXjm/2l55/9nduT/Z3Xk/2l45/9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/Z3bk/2d25P9peOb/aXjm/2l45v9IWuD/Kzi4/wkMbPIAADRcAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAABgHA8Tf8QxP8L/RVfg/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/Rljg/zJAw/8PE337AABBfAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgJA8Tf8QrOLj/QVPf/1lp4/9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/WWnj/0FT3/8rOLj/DxN9+gAARoAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgHAoNdKAiLKb/OkzZ/0ZY4P9dbeT/aXjm/2l45v9peOb/aXjm/2l45v9peOb/aXjm/2l45v9peOb/XW3k/0ZY4P86TNn/Iiym/wkMbu0AAEdlAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABfCQAAX1sSGIbnJzKw/zpM2f9BU9//Slzh/1Zn4/9hceX/aHfm/2Fx5f9WZ+P/Slzh/0FT3/86TNn/JzKw/xIYhv8AAFWyAABENQAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXxkAAF9pDRF83xsjmP8oM7L/MkHG/zlK1f8+T93/OUrV/zJBxv8oM7L/GyOY/w0RfP4AAFiuAABORQAAJgcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF8JAABdLwAAXmYAAF+iAABh1QAAYvYAAGHqAABfvwAAW4kAAFZPAABNHgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/8AD//8AAP/8AAA/+AAAH/AAAA/gAAAHwAAAA8AAAAOAAAABgAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAGAAAABwAAAA8AAAAPgAAAH8AAAD/gAAB/8AAA//wAA///AA/8=";
  data = eri.replace(/^data:image\/\w+;base64,/, "");
  buf = new Buffer(data, 'base64');
  fs.writeFile('./public/img/error.ico', buf, 'binary', function (err) {});

  // copy css templates
  switch (program.css) {
    case 'less':
  //  copyTemplateMulti('css', dir + '/public/css', '*.less');
      mkdir(dir, 'less');
      copyTemplateMulti('css', dir + '/less', '*.less');
      break;
    case 'stylus':
  //  copyTemplateMulti('css', dir + '/public/css', '*.styl');
      mkdir(dir, 'styl');
      copyTemplateMulti('css', dir + '/styl', '*.styl');
      break;
    case 'compass':
  //  copyTemplateMulti('css', dir + '/public/css', '*.scss');
      mkdir(dir, 'scss');
      copyTemplateMulti('css', dir + '/scss', '*.scss');
      break;
    case 'sass':
  //  copyTemplateMulti('css', dir + '/public/stylesheets', '*.sass');
      mkdir(dir, 'sass');
      copyTemplateMulti('css', dir + '/sass', '*.sass');
      break;
    default:
      copyTemplateMulti('css', dir + '/public/css', '*.css');
      break;
  }

  // copy route templates
  mkdir(dir, 'routes');
  if (program.es6) {
    /*! ES6 Support */
    copyTemplateMulti('js/routes/es6', dir + '/routes', '*.js');
  } else {
    copyTemplateMulti('js/routes', dir + '/routes', '*.js');
  }

  if (program.view) {
    // Copy view templates
    mkdir(dir, 'views');
    pkg.dependencies['http-errors'] = '^1.7.1';
    switch (program.view) {
      case 'dust':
        copyTemplateMulti('views', dir + '/views', '*.dust');
        break;
      case 'ejs':
        copyTemplateMulti('views', dir + '/views', '*.ejs');
        break;
      case 'hbs':
        copyTemplateMulti('views', dir + '/views', '*.hbs');
        break;
      case 'hjs':
        copyTemplateMulti('views', dir + '/views', '*.hjs');
        break;
      case 'jade':
        copyTemplateMulti('views', dir + '/views', '*.jade');
        break;
      case 'pug':
        copyTemplateMulti('views', dir + '/views', '*.pug');
        break;
      case 'twig':
        copyTemplateMulti('views', dir + '/views', '*.twig');
        break;
      case 'vash':
        copyTemplateMulti('views', dir + '/views', '*.vash');
        break;
    }
  } else {
    // Copy extra public files
    copyTemplate('js/index.html', path.join(dir, 'public/index.html'));
  }

  // CSS Engine support
  switch (program.css) {
    case 'compass':
      app.locals.modules.compass = 'node-compass';
      app.locals.uses.push(
        "compass({\n" +
        "  mode: 'expanded', // options: [expanded], 'compress', 'nested', 'compressed', 'compact'\n" +
        "  css : 'css',\n" + // css compiled stylesheets output path
        "  sass: path.join(__dirname, 'scss'),\n" +     // The folder inside the project to find sCss in.
        "  project: path.join(__dirname, 'public')\n" + // dest: /public/css
        "})"
      );
      pkg.dependencies['node-compass'] = '0.2.3';
      break;
    case 'less':
      app.locals.modules.lessMiddleware = 'less-middleware';
      if (program.es6) {
        app.locals.uses.push("lessMiddleware(path.join(__dirname, 'less'), {\n  // github.com/emberfeather/less.js-middleware/wiki/Examples\n  // less-middleware/lib/middleware.js\n  // option:\n  // cacheFile, [debug], [dest], [force], [once], pathRoot, postprocess, [preprocess], [render], storeCss, storeSourcemap\n  /**\n   * @debug : true\n   * pathname: /css/style.css\n   * source  : \\project\\less\\style.less\n   * dest    : \\project\\public\\css\\style.css\n  */\n  debug : true,\n  dest  : path.join(__dirname, 'public'),\n  force : false,\n  once  : false,\n  render: { compress: false },\n  preprocess: {\n    path: (pathname, req) => { return pathname.replace('\\\\css', ''); }\n  }\n})");
      } else {
        app.locals.uses.push("lessMiddleware(path.join(__dirname, 'less'), {\n  // github.com/emberfeather/less.js-middleware/wiki/Examples\n  // less-middleware/lib/middleware.js\n  // option:\n  // cacheFile, [debug], [dest], [force], [once], pathRoot, postprocess, [preprocess], [render], storeCss, storeSourcemap\n  /**\n   * @debug : true\n   * pathname: /css/style.css\n   * source  : \\project\\less\\style.less\n   * dest    : \\project\\public\\css\\style.css\n  */\n  debug : true,\n  dest  : path.join(__dirname, 'public'),\n  force : false,\n  once  : false,\n  render: { compress: false },\n  preprocess: {\n    path: function (pathname, req) { return pathname.replace('\\\\css', ''); }\n  }\n})");
      }
      pkg.dependencies['less-middleware'] = '~2.2.1'; // '^3.0.1' had path resolve problem
      break;
    case 'sass':
      app.locals.modules.sassMiddleware = 'node-sass-middleware';
      app.locals.uses.push("sassMiddleware({\n   src: path.join(__dirname, 'sass'),\n  dest: path.join(__dirname, 'public/css'),\n  debug: true,\n  indentedSyntax: true, // true = .sass and false = .scss \n  sourceMap: false,\n  prefix: '/css',\n  outputStyle: 'expanded' // 'nested' | [expanded] | 'compact' | 'compressed' \n})");
      pkg.dependencies['node-sass-middleware'] = '^0.11.0';
      break;
    case 'stylus':
      app.locals.modules.stylus = 'stylus';
  //  app.locals.uses.push("stylus.middleware(path.join(__dirname, 'public'))");
      if (program.es6) {
        app.locals.uses.push("stylus.middleware({\n  // options: [force], [src], [dest], [compile], [compress], firebug, linenos, sourcemap\n  // ref: stylus\\lib\\middleware.js\n  src  : path.join(__dirname + '/styl'),\n  dest : path.join(__dirname + '/public/css'),\n  force: false,\n  compile: (str) => { return stylus(str).set('compress', false); }\n})");
      } else {
        app.locals.uses.push("stylus.middleware({\n  // options: [force], [src], [dest], [compile], [compress], firebug, linenos, sourcemap\n  // ref: stylus\\lib\\middleware.js\n  src  : path.join(__dirname + '/styl'),\n  dest : path.join(__dirname + '/public/css'),\n  force: false,\n  compile: function (str) { return stylus(str).set('compress', false); }\n})");
      }
      pkg.dependencies['stylus'] = '^0.54.5';
      break;
  }

  // Index router mount
  app.locals.localModules.indexRouter = './routes/index';
  app.locals.mounts.push({ path: '/', code: 'indexRouter' });

  // User router mount
  app.locals.localModules.usersRouter = './routes/users';
  app.locals.mounts.push({ path: '/users', code: 'usersRouter' });

  app.locals.vieweng = true; // Template support
  switch (program.view) {
    case 'dust':  // github.com/krakenjs/adaro
      app.locals.modules.adaro = 'adaro';
      app.locals.view = {
        engine: 'dust',
        render: 'adaro.dust()'
      };
      pkg.dependencies.adaro = '~1.0.4';
      break;
    case 'ejs':  // github.com/mde/ejs
      app.locals.view = { engine: 'ejs' };
      pkg.dependencies.ejs = '~2.5.8'; // '~2.5.7';
      break;
    case 'hbs':  // github.com/pillarjs/hbs
      app.locals.view = { engine: 'hbs' };
      pkg.dependencies.hbs = '~4.0.1';
      break;
    case 'hjs':  // express 3.x: github.com/nullfirm/hjs/
      app.locals.view = { engine: 'hjs' };
      pkg.dependencies.hjs = '~0.0.6';
      break;
    case 'jade':
      app.locals.view = { engine: 'jade' };
      pkg.dependencies.jade = '~1.11.0';
      break;
    case 'pug':  // github.com/pugjs/pug
      app.locals.view = { engine: 'pug' };
      pkg.dependencies.pug = '^2.0.3'; // '2.0.0-beta11'
      break;
    case 'twig': // github.com/twigjs/twig.js/
      app.locals.view = { engine: 'twig' };
      pkg.dependencies.twig = '^1.12.0'; // '~0.10.3';
      break;
    case 'vash': // github.com/kirbysayshi/vash/
      app.locals.view = { engine: 'vash' };
      pkg.dependencies.vash = '~0.12.6'; // '~0.12.4';
      break;
    default:
      /*!
        when program.options = --no-view, in app.js.ejs :
        <% if (view) { -%>
          ...
        <% } -%>
        app.locals.view MUST be set to 'true'
      */
      app.locals.view = true;     // false;
      app.locals.vieweng = false; // used in \gen4node\templates\js\app.js.ejs #34
      break;
  }

  // Static files
  if (!(program.view)) {
    app.locals.uses.push("express.static(path.join(__dirname, 'public'))");
  } else {
    if (program.es6) {
      app.locals.uses.push("express.static(path.join(__dirname, 'public'),\n  { dotfiles: 'ignore',\n    etag: true,\n    extensions: ['htm', 'html'],\n    fallthrough: true,\n    immutable: false,\n    index: false,\n    lastModified: true,\n    maxAge: '1h',\n    redirect: true,\n    setHeaders: (res, path, stat) => {\n      res.set('x-timestamp', Date.now());\n      mimeTIE = mimetype.lookup(path);\n      if (mimeTIE !== 'text/html') {\n        res.setHeader('Cache-Control', 'public, max-age=1800');\n        res.setHeader('Expires', new Date(Date.now() + 2 * 60* 60).toUTCString());\n    //  console.log('path: ' + path);\n      }\n    //  console.log('Current mimeTypes: ' + mimeTIE);\n    }\n  }\n)");
    } else {
      app.locals.uses.push("express.static(path.join(__dirname, 'public'),\n  { dotfiles: 'ignore',\n    etag: true,\n    extensions: ['htm', 'html'],\n    fallthrough: true,\n    immutable: false,\n    index: false,\n    lastModified: true,\n    maxAge: '1h',\n    redirect: true,\n    setHeaders: function (res, path, stat) {\n      res.set('x-timestamp', Date.now());\n      mimeTIE = mimetype.lookup(path);\n      if (mimeTIE !== 'text/html') {\n        res.setHeader('Cache-Control', 'public, max-age=1800');\n        res.setHeader('Expires', new Date(Date.now() + 2 * 60* 60).toUTCString());\n    //  console.log('path: ' + path);\n      }\n    //  console.log('Current mimeTypes: ' + mimeTIE);\n    }\n  }\n)");
    }
  }

  // 03:11 06-Dec-2018 TEST framework example from
  // github.com/expressjs/generator/pull/220/commits/b58278700212e500d81f06d0a068973885214c72
  /** Test framework
  if (program.test) {
    mkdir(dir, 'test')
    copyTemplate('test/test.js', path.join(dir, 'test', 'test.js'))

    pkg.scripts['test'] = 'mocha'
    pkg.devDependencies = {
      mocha: '~5.2.0',
      chai: '~4.2.0'
    }
  }
  */
  if (program.git) {
    copyTemplate('js/gitignore', path.join(dir, '.gitignore'));
  }

  // sort dependencies like npm(1)
  pkg.dependencies = sortedObject(pkg.dependencies);

  // write files
  write(path.join(dir, 'app.js'), app.render());
  write(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  mkdir(dir, 'bin');
  write(path.join(dir, 'bin/www'), www.render(), MODE_0755);

  var prompt = launchedFromCmd() ? '>' : '$';

  if (dir !== '.') {
    console.log();
    console.log('   change directory:');
    console.log('     %s cd %s', prompt, dir);
  }
  console.log();
  console.log('   install dependencies:');
  console.log('     %s npm install', prompt);
  console.log();
  console.log('   run the app:');

  if (launchedFromCmd()) {
    console.log('     %s SET DEBUG=%s:* & npm start', prompt, name);
  } else {
    console.log('     %s DEBUG=%s:* npm start', prompt, name);
  }
  console.log();
}

/**
 * Create an app name from a directory path, fitting npm naming requirements.
 *
 * @param {String} pathName
 */
function createAppName(pathName) {
  return path.basename(pathName)
    .replace(/[^A-Za-z0-9.-]+/g, '-')
    .replace(/^[-_.]+|-+$/g, '')
    .toLowerCase();
}

/**
 * Check if the given directory `dir` is empty.
 *
 * @param {String} dir
 * @param {Function} fn
 */
function emptyDirectory(dir, fn) {
  fs.readdir(dir, function (err, files) {
    if (err && err.code !== 'ENOENT') { throw err; }
    fn(!files || !files.length);
  });
}

/** Graceful exit for async STDIO */
function exit(code) {
  // flush output for Node.js Windows pipe bug
  // https://github.com/joyent/node/issues/6247 is just one bug example
  // https://github.com/visionmedia/mocha/issues/333 has a good discussion
  function done() {
    if (!(draining--)) { _exit(code); }
  }

  var draining = 0;
  var streams = [process.stdout, process.stderr];

  exit.exited = true;

  streams.forEach(function (stream) {
    // submit empty write request and wait for completion
    draining += 1;
    stream.write('', done);
  });
  done();
}

/** Determine if launched from cmd.exe */
function launchedFromCmd() {
  return process.platform === 'win32' && process.env._ === undefined;
}

/** Load template file. */
function loadTemplate(name) {
  var contents = fs.readFileSync(path.join(__dirname, '..', 'templates', (name + '.ejs')), 'utf-8');
  var locals = Object.create(null);

  function render() {
    return ejs.render(contents, locals, { escape: util.inspect });
  }
  return { locals: locals, render: render };
}

/** Main program. */
function main() {
  // Path
  var destinationPath = program.args.shift() || '.';

  // App name
  var appName = createAppName(path.resolve(destinationPath)) || 'hello-world';

  // View engine
  if (program.view === true) {
    if (program.ejs) { program.view = 'ejs'; }
    if (program.hbs) { program.view = 'hbs'; }
    if (program.hogan) { program.view = 'hjs'; }
    if (program.pug) { program.view = 'pug'; }
  }

  // Default view engine = Pug
  if (program.view === true) {
    /*
    warning('the default view engine will not be jade in future releases\n' +
      "use `--view=jade' or `--help' for additional options");
    */
//  program.view = 'jade';
    program.view = 'pug';
  }

  // Generate application
  emptyDirectory(destinationPath, function (empty) {
    if (empty || program.force) {
      createApplication(appName, destinationPath);
    } else {
      confirm('destination is not empty, continue? [y/N] ', function (ok) {
        if (ok) {
          process.stdin.destroy();
          createApplication(appName, destinationPath);
        } else {
          console.error('aborting');
          exit(1);
        }
      });
    }
  });
}

/**
 * Make the given dir relative to base.
 *
 * @param {string} base
 * @param {string} dir
 */
function mkdir(base, dir) {
  var loc = path.join(base, dir);

  console.log('   \x1b[36mcreate\x1b[0m : ' + loc + path.sep);
  mkdirp.sync(loc, MODE_0755);
}

/**
 * Generate a callback function for commander to warn about renamed option.
 *
 * @param {String} originalName
 * @param {String} newName
 */
function renamedOption(originalName, newName) {
  return function (val) {
    warning(util.format("option `%s' has been renamed to `%s'", originalName, newName));
    return val;
  };
}

/**
 * Display a warning similar to how errors are displayed by commander.
 *
 * @param {String} message
 */
function warning(message) {
  console.error();
  message.split('\n').forEach(function (line) {
    console.error('  warning: %s', line);
  });
  console.error();
}

/**
 * echo str > file.
 *
 * @param {String} file
 * @param {String} str
 */
function write(file, str, mode) {
  fs.writeFileSync(file, str, { mode: mode || MODE_0666 });
  console.log('   \x1b[36mcreate\x1b[0m : ' + file);
}

/* \express-generator\bin\express-cli.js => gen4node\bin\gen4node.js */
