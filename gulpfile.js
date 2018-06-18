const browserSync = require('browser-sync');
const gulp = require('gulp');
const cached = require('gulp-cached');
const changed = require('gulp-changed');
const plumber = require('gulp-plumber');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const packageImporter = require('node-sass-package-importer');
const imagemin = require('gulp-imagemin');

imagemin.mozjpeg = require('imagemin-mozjpeg');
imagemin.pngquant = require('imagemin-pngquant');
imagemin.pngcrush = require('imagemin-pngcrush');

const path = {};
path.pug = {
  src: 'src/pug/**/*.pug',
  ignore: '!src/pug/**/_*.pug',
  basedir: 'src/pug',
  dest: 'public',
};
path.sass = {
  src: 'src/scss/**/*.scss',
  destSelf: 'src/scss',
  dest: 'public/css',
};
path.js = {
  dest: 'public/js/**',
};
path.img = {
  src: 'src/img/**',
  dest: 'public/img',
};

/**
 * Compile pug files into HTML
 */
gulp.task('templates', () => gulp
  .src([path.pug.src, path.pug.ignore])
  .pipe(cached('pug'))
  .pipe(plumber())
  .pipe(pug({
    pretty: true,
    basedir: path.pug.basedir,
  }))
  .pipe(gulp.dest(path.pug.dest)));

/**
 * Important!!
 * Separate task for the reaction to `.pug` files
 */
gulp.task('pug-watch', ['templates'], browserSync.reload);

/**
 * task for image
 */
gulp.task('image', () => gulp
  .src(path.img.src)
  .pipe(changed(path.img.dest))
  .pipe(plumber())
  .pipe(imagemin([
    imagemin.mozjpeg({ quality: 85, progressive: true }),
    imagemin.pngquant({ quality: '70-85' }),
    imagemin.pngcrush,
    imagemin.svgo({
      plugins: [
        { removeViewBox: true },
        { cleanupIDs: true },
      ],
    }),
  ]))
  .pipe(gulp.dest(path.img.dest)));

/**
 * Sass task for live injecting into all browsers
 */
gulp.task('sass', () => gulp
  .src(path.sass.src)
  .pipe(plumber())
  .pipe(sassGlob())
  .pipe(sass({ importer: packageImporter() }))
  .on('error', sass.logError)
  .pipe(gulp.dest(path.sass.dest))
  .pipe(browserSync.reload({ stream: true })));

/**
 * Task for just build & deploy files
 */
gulp.task('build', ['image', 'sass', 'templates']);

/**
 * Serve and watch the scss/pug files for changes
 */
gulp.task('default', ['sass', 'templates'], () => {
  browserSync({ server: path.pug.dest });

  gulp.watch(path.sass.src, ['sass']);
  gulp.watch(path.pug.src, ['pug-watch']);
  gulp.watch(path.js.dest, browserSync.reload);
});
