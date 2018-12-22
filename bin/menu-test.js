var program  = require('./commander');

var path = require('path');

var readline = require('readline');
var sortedObject = require('sorted-object');
var util   = require('util');
var semver = require('semver');

var MODE_0666 = parseInt('0666', 8);
var MODE_0755 = parseInt('0755', 8);
var TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
var VERSION = require('../package').version;

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
  .option('    --watch <type>', 'add [nodemon] supported from github.com/remy/nodemon')
//.option('-w, --no-watch', 'without nodemon support (Default)')
  .option('-f, --force', 'force on non-empty directory');
//.parse(process.argv);

if (semver.gte(process.version, '6.0.0')) {
  program.option('    --es6', 'use ES6 (ES2015) language features');
}
program.parse(process.argv);

console.log('css   ' + program.css);
console.log('es6   ' + program.es6);
console.log('force ' + program.force);
console.log('git   ' + program.git);
console.log('test  ' + program.test);
console.log('view  ' + program.view);
console.log('watch ' + program.watch);

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

function renamedOption(originalName, newName) {
  return function (val) {
    warning(util.format("option `%s' has been renamed to `%s'", originalName, newName));
    return val;
  };
}

function warning(message) {
  console.error();
  message.split('\n').forEach(function (line) {
    console.error('  warning: %s', line);
  });
  console.error();
}

/* result

\gen4node\bin>node menu-test --view=ejs -g -t --css=sass --watch=nodemon --es6 -f
css   sass
es6   true
force true
git   true
test  true
view  ejs
watch nodemon

\gen4node\bin>node menu-test --view=ejs -g -t --css=sass --es6 -f
css   sass
es6   true
force true
git   true
test  true
view  ejs
watch undefined

*/