import gulp from 'gulp';
import del from 'del';
import path from 'path';
import runSequence from 'run-sequence';
import gulpLoadPlugins from 'gulp-load-plugins';

const plugins = gulpLoadPlugins();

const paths = {
  js: ['app/**/*.js', '!dist/**', '!node_modules/**'],
  nonJs: ['./package.json', './.gitignore', './.env', './app/public/**/*'],
  tests: './server/tests/*.js',
};

gulp.task('clean', () =>
  del.sync(['dist/**', 'dist/.*']),
);

gulp.task('copy', () =>
  gulp.src(paths.nonJs, { base: '.' })
    .pipe(plugins.newer('dist'))
    .pipe(gulp.dest('dist')),
);

gulp.task('babel', () =>
  gulp.src([...paths.js, '!gulpfile.babel.js'], { base: '.' })
    .pipe(plugins.newer('dist'))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel())
    .pipe(plugins.sourcemaps.write('.', {
      includeContent: false,
      sourceRoot(file) {
        return path.relative(file.path, __dirname);
      },
    }))
    .pipe(gulp.dest('dist')),
);

gulp.task('nodemon', ['copy', 'babel'], () =>
  plugins.nodemon({
    script: path.join('dist/app', 'app.js'),
    ext: 'js',
    ignore: ['node_modules/**/*.js', 'dist/**/*.js'],
    tasks: ['copy', 'babel'],
  }),
);

gulp.task('serve', ['clean'], () => runSequence('nodemon'));

gulp.task('default', ['clean'], () => {
  runSequence(
    ['babel', 'copy'],
  );
});
