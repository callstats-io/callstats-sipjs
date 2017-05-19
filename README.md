# callstats-sipjs

[SIP.js](https://sipjs.com/) interface to [callstats.io](http://callstats.io/).


## Install

* Adding a `<script>` tag in the HTML.

In case no module loaded is used, a global `window.callstatssipjs` is exposed.

_NOTE:_ This library does not include the **callstats.io** library (it must be added separetely).


## Documentation

* Read the full [documentation](docs/index.md) in the docs folder.


## Usage example

In the HTML:

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- Load callstats.io library (it provides window.callstats -->
    <script src="https://api.callstats.io/static/callstats.min.js"></script>
    <!-- Load SIPjs library -->
    <script src="js/sipjs.js"></script>
    <!-- Load callstats-sipjs library (it provides window.callstatssipjs) -->
    <script src="js/callstats-sipjs.js"></script>
    <!-- Load our app code -->
    <script src="js/app.js"></script>
  </head>

  <body>
    <!-- your stuff -->
  </body>
</html>
```

In `app.js`:

```javascript
// Create a SIP.UA instance
var ua = new SIP.UA(config);

// Run the callstats-sipjs library for this UA
callstatssipjs(ua, AppID, AppSecret);
```


## Development (TODO)

When using Bower or a `<script>` tag, the provided library is built with [browserify](http://browserify.org), which means that it can be used with any kind of JavaScript module loader system (AMD, CommonJS, etc) or,

* Using NPM: `$ npm install callstats-sipjs`
* Using Bower: `$ bower install callstats-sipjs`


Install NPM development dependencies:

```bash
$ npm install
```

Install `gulp-cli` globally (which provides the `gulp` command):

```bash
$ npm install -g gulpjs
```

* `gulp prod` generates a production/minified `dist/callstats-sipjs.min.js` bundle.
* `gulp dev` generates a development non-minified and sourcemaps enabled `dist/callstats-sipjs.js` bundle.


## Authors

Dan Jenkins at Nimble Ape Ltd (https://nimblea.pe).
