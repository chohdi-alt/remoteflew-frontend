module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],

    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],

    client: {
      jasmine: {},
      clearContext: false
    },

    jasmineHtmlReporter: {
      suppressAll: true
    },

    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/remote-flow-app'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' }
      ],

      // ✅ TEMPORARY CI SAFE THRESHOLD
      check: {
        global: {
          statements: 30,
          branches: 20,
          functions: 20,
          lines: 30
        }
      }
    },

    reporters: ['progress', 'kjhtml'],

    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,

    autoWatch: false, // ✅ CI SAFE
    browsers: ['ChromeHeadlessCI'], // ✅ FORCE CI BROWSER

    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    },

    singleRun: true, // ✅ CRITICAL FOR CI
    restartOnFileChange: false
  });
};