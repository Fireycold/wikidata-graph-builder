/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const browserSync = require('browser-sync').create();
const es = require('event-stream');
const $ = gulpLoadPlugins();

const production = !!$.util.env.production;

gulp.task('browser-sync', function() {
    browserSync.init({server: {baseDir: './dist'}});
});

gulp.task('serve', function() {
    browserSync.init({server: './dist'});
    gulp.watch('src/assets/stylesheets/*.styl', [ 'css' ]);
    gulp.watch('src/assets/scripts/*.js', [ 'js' ]);
    gulp.watch('src/assets/scripts/*.coffee', [ 'js' ]);
    gulp.watch('src/*.jade', [ 'templates' ]);
});

// Build tasks
gulp.task('bower-css', () => gulp.src([
    'bower_components/**/*.min.css',
    '!bower_components/angular-material/modules/**/*.min.css',
    '!bower_components/angular-material/layouts/**/*.min.css',
    '!bower_components/angular-material/core/**/*.min.css'
])
.pipe($.flatten())
.pipe(gulp.dest('dist/assets/css/')));

gulp.task('bower-js', () => gulp.src([
    'bower_components/**/*.min.js',
    'bower_components/**/color-hash.js',
    '!bower_components/angular-material/modules/**/*.min.js'
])
.pipe($.flatten())
.pipe(gulp.dest('dist/assets/js/')));

gulp.task('bower-fonts', () => gulp.src([
    'bower_components/**/dist/fonts/*.eot',
    'bower_components/**/dist/fonts/*.svg',
    'bower_components/**/dist/fonts/*.ttf',
    'bower_components/**/dist/fonts/*.woff',
    'bower_components/**/dist/fonts/*.woff2'
])
.pipe($.flatten())
.pipe(gulp.dest('dist/assets/fonts/')));

gulp.task('bower-all', ['bower-css', 'bower-js', 'bower-fonts']);

gulp.task('css', () => gulp.src('src/assets/stylesheets/*.styl')
.pipe($.stylus())
.pipe($.autoprefixer())
.pipe(production ? $.csso() : $.util.noop())
.pipe(gulp.dest('dist/assets/css/'))
.pipe(browserSync.stream()));

gulp.task('js', () => es.merge(gulp.src('src/assets/scripts/*.coffee')
.pipe($.coffee()), gulp.src('src/assets/scripts/*.js'))
.pipe(production ? $.uglify() : $.util.noop())
.pipe($.concat('all.min.js'))
.pipe(gulp.dest('dist/assets/js/'))
.pipe(browserSync.stream()));

gulp.task('templates', () => gulp.src('src/*.jade')
    .pipe($.jade({pretty: true}))
    .pipe(production ? $.htmlmin({collapseWhitespace: true}) : $.util.noop())
    .pipe(gulp.dest('dist/'))
    .pipe(browserSync.stream()));

gulp.task('bower', () => $.bower());

gulp.task('deploy', function() {
    let conf;
    const ghToken = process.env.GH_TOKEN;
    const ghRef = process.env.GH_REF;
    if (ghToken && ghRef) { conf = {remoteUrl: `https://${ghToken}@${ghRef}`}; }
    return gulp.src('./dist/**/*')
    .pipe($.ghPages(conf));
});


// User tasks
gulp.task('build', ['bower-all', 'js', 'css', 'templates']);
gulp.task('default', ['build', 'serve']);
