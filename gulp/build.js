(function () {
  'use strict';
  
  var gulp = require('gulp'),
      sass = require('gulp-sass'),
      postcss = require('gulp-postcss'),
      autoprefixer = require('autoprefixer'),
      $ = require('gulp-load-plugins')(),
      fs = require('fs'),
      generateGlyphiconsData = require('../grunt/bs-glyphicons-data-generator.js'),
      BsSassdocParser = require('../grunt/bs-sassdoc-parser.js'),
      generateRawFiles = require('../grunt/bs-raw-files-generator.js'),
      cp = require('child_process'),
      gulpUtil = require('gulp-util'),
      _ = require('lodash'),
      path = gulp.path,
      htmlminOpt = {
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        decodeEntities: false,
        minifyCSS: {
          compatibility: 'ie8',
          keepSpecialComments: 0
        },
        minifyJS: true,
        minifyURLs: false,
        processConditionalComments: true,
        removeAttributeQuotes: true,
        removeComments: true,
        removeOptionalAttributes: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        removeTagWhitespace: false,
        sortAttributes: true,
        sortClassName: true
      };
  
  function getFileName (file) {
    var filePath = file.path.split(file.base),
        fileName = filePath[1];
    
    return fileName;
  }
  
  gulp.task('concat:docsjs', function () {
    
    gulp.src([
        path.assets + '/js/vendor/holder.min.js',
        path.assets + '/js/vendor/ZeroClipboard.min.js',
        path.assets + '/js/vendor/anchor.min.js',
        path.assets + '/js/src/application.js'
      ])
      .pipe($.concat('docs.min.js'))
      .pipe($.uglify({ output: { quote_style: 1 }}).on('error', $.util.log))
      .pipe(gulp.dest(path.assets + '/js'));
    
  });
  
  gulp.task('concat:customizerjs', function () {
    
    gulp.src([
        path.assets + '/js/vendor/autoprefixer.js',
        path.assets + '/js/vendor/less.min.js',
        path.assets + '/js/vendor/jszip.min.js',
        path.assets + '/js/vendor/uglify.min.js',
        path.assets + '/js/vendor/Blob.js',
        path.assets + '/js/vendor/FileSaver.js',
        path.assets + '/js/raw-files.min.js',
        path.assets + '/js/src/customizer.js'
      ])
      .pipe($.concat('customize.min.js'))
      .pipe($.uglify({ output: { quote_style: 1 }}).on('error', $.util.log))
      .pipe(gulp.dest(path.assets + '/js'));
    
  });
  
  // 사스 컴파일 컨캣
  gulp.task('concat:bootstrapCss', function () {
    
    gulp.src(path.scss + '/**/*.scss')
      .pipe(sass().on('error', sass.logError))
      .pipe(postcss([autoprefixer()]))
      .pipe(gulp.dest(path.dist + '/css'))
    
  });
  
  // 사스 컴파일 미니파이
  gulp.task('minify:bootstrapCss', function () {
    
    gulp.src(path.scss + '/**/*.scss')
      .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
      .pipe($.rename('bootstrap.min.css'))
      .pipe(postcss([autoprefixer()]))
      .pipe(gulp.dest(path.dist + '/css'))
    
  });
  
  gulp.task('concat:bootstrapJs', function () {
    
    gulp.src([path.root + 'js/*.js', '!' + path.root + 'js/tests'])
      .pipe($.concat('bootstrap.js'))
      .pipe(gulp.dest(path.dist + '/js'));
    
  });
  
  gulp.task('minify:bootstrapJs', function () {
    
    setTimeout(function () {
      gulp.src([path.dist + '/js/bootstrap.js'])
        .pipe($.uglify())
        .pipe($.rename('bootstrap.min.js'))
        .pipe(gulp.dest(path.dist + '/js'));
    }, 100);

  });
  
  gulp.task('concat:docsCss', function () {
    
    gulp.src(path.assets + '/css/src/*.css')
      .pipe($.concat('docs.min.css'))
      .pipe(gulp.dest(path.assets + '/css'))
      .pipe($.debug({showFiles: true}));
    
  });
  
  gulp.task('generateGlyphiconsData', function () {
    generateGlyphiconsData.call();
  });
  
  gulp.task('pug', function () {
    
    var getSassVarsData = function () {
      var filePath = path.root + 'scss/bootstrap/_variables.scss',
          fileContent = fs.readFileSync(filePath, { encoding: 'utf8' }),
          parser = new BsSassdocParser(fileContent);
  
      return { sections: parser.parseFile() };
    }();
    
    gulp.src([path.docs + '/_pug/*.pug'])
      .pipe($.foreach(function (stream, file) {
        var pugFileName = getFileName(file),
            htmlFile = pugFileName.indexOf('nav') > 0 ? 'customize.html' : 'customizer-variables.html',
            destPath = pugFileName.indexOf('nav') > 0 ? path.docs + '/_includes/nav' : path.docs + '/_includes';
        
        return stream
          .pipe($.pug({
            data: getSassVarsData
          }))
          .pipe($.rename(htmlFile))
          .pipe($.debug())
          .pipe(gulp.dest(destPath));
      }));
    
  });
  
  gulp.task('generateRawFiles', function () {
    generateRawFiles();
  });
  
  gulp.task('jekyll:build', ['clean:ghPages'], function () {
    var jekyll = cp.spawn('jekyll', ['build']),
      jekyllLogger = function (buffer) {
        buffer.toString()
          .split(/\n/)
          .forEach(function (message) {
            gulpUtil.log('Jekyll: ' + message);
          });
      };
    
    jekyll.stdout.on('data', jekyllLogger);
    jekyll.stderr.on('data', jekyllLogger);
  });
  
  gulp.task('minify:jekyllHtml', function () {
    gulp.src([path.ghPages + '/**/*.html', '!' + path.ghPages + '/examples/**/*.html'])
      .pipe($.foreach(function (stream, file) {
        var filePath = _.last(file.path.split(file.base)),
            fileName = filePath.split('/'),
            lastDir = _.head(fileName) !== 'index.html' ? _.head(fileName) : '',
            lastFileName = _.isEmpty(lastDir) ? _.head(fileName) : _.last(fileName),
            destPath = _.isEmpty(lastDir) ? path.ghPages : path.ghPages + '/' + lastDir;
        
        return stream
          .pipe($.rename('_' + lastFileName))
          .pipe($.htmlmin(htmlminOpt))
          .pipe($.debug())
          .pipe(gulp.dest(destPath));
      }));
  });
  
  /*gulp.task('rename:jekyllHtml', function () {
    gulp.src([path.ghPages + '/!**!/!*.html', '!' + path.ghPages + '/examples/!**!/!*.html'])
      .pipe($.foreach(function (stream, file) {
        var filePath = _.last(file.path.split(file.base)),
          fileName = filePath.split('/'),
          lastDir = _.head(fileName) !== 'index.html' ? _.head(fileName) : '',
          destPath = _.isEmpty(lastDir) ? path.ghPages : path.ghPages + '/' + lastDir;

        return stream
          .pipe($.rename('index.html'))
          .pipe($.debug())
          .pipe(gulp.dest(destPath));
      }));
  });*/
  
  gulp.task('bootstrapJs', ['concat:bootstrapJs', 'minify:bootstrapJs']);
  gulp.task('bootstrapCss', ['concat:bootstrapCss', 'minify:bootstrapCss']);
  
  gulp.task('concat', ['concat:docsCss', 'concat:docsjs', 'concat:customizerjs']);
  gulp.task('concat:js', ['concat:docsjs', 'concat:customizerjs']);
  gulp.task('jekyllHtmlMin', ['minify:jekyllHtml', 'clean:ghPagesOriginHtml', '']);
  // gulp.task('build', ['jekyll:build', '']);
  
})();
