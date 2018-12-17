[![Express Logo](https://i.cloudup.com/zfY6lL7eFa-3000x3000.png)](http://expressjs.com/)

[Express'](https://www.npmjs.com/package/express) application generator... 

[Express-generator](https://github.com/expressjs/generator) Modified version for Windows test

Supported format: [dust](https://github.com/krakenjs/adaro),  [ejs](https://github.com/mde/ejs),  [pug](https://github.com/pugjs/pug) renamed from jade,  [hbs](https://github.com/pillarjs/hbs),  [hogan](https://github.com/nullfirm/hjs/) for express 3.x,  [twig](https://github.com/twigjs/twig.js/),  [vash](https://github.com/kirbysayshi/vash/)

Stylesheet format: css,  [less](https://github.com/emberfeather/less.js-middleware/),  [stylus](https://github.com/stylus/stylus),  [compass](),  [sass/scss](https://github.com/sass/node-sass-middleware)

## Installation

```sh
$ npm install -g gen4node
```

## Quick Start

The quickest way to get started with express is to utilize the executable `gen4code` to generate an application as shown below:

Create the app:

```bash
\> gen4node --view=ejs --css=styl --watch=nodemon
```

Install dependencies:

```bash
\> npm install
```

Start your Express.js app at `http://localhost:8080/ `:

```bash
\> npm start
```

Start with [nodemon](https://github.com/remy/nodemon) :

```bash
\> npm run devstart
```

## Command Line Options

This generator can also be further configured with the following command line flags.

        --version        output the version number
    -e, --ejs            add ejs engine support
    -p  --pug            add pug engine support
        --hbs            add handlebars engine support
        --hogan          add hogan.js engine support
        --view <engine>  add view <engine> support (dust|ejs|hbs|hjs|jade|pug|twig|vash) (defaults to pug)
    -X, --no-view        use static html instead of view engine
    -c, --css <engine>   add stylesheet <engine> support (less|stylus|compass|sass) (defaults to plain css)
    -g, --git            add .gitignore
    -t, --test           add mocha support (not finish yet)
    -W, --watch <type>   add [nodemon] support
    -w, --no-watch       without nodemon support
    -f, --force          force on non-empty directory
        --es6            use ES6 (ES2015) language features
    -h, --help           output usage information
## License

[MIT](LICENSE)

