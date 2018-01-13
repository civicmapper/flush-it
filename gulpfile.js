var gulp = require("gulp");
var gutil = require("gulp-util");
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var cleanCss = require('gulp-clean-css');
var sourcemaps = require('gulp-sourcemaps');

var browserify = require("browserify");
var watchify = require("watchify");
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

var browserSync = require('browser-sync');
var exec = require('child_process').exec;

var config = {
    paths: {
        jsToBundle: ['src/js/app/main.js'],
        jsToMove: ['src/js/compatibility/*.js'],
        css: [
            'node_modules/leaflet/dist/leaflet.css',
            'node_modules/bootstrap/dist/css/bootstrap.min.css',
            'node_modules/font-awesome/css/font-awesome.min.css',
            "src/css/main.css",

        ],
        leaflet: {
            assets: [
                'node_modules/leaflet/dist/images/**/*'
            ]
        },
        dist: 'project/static'
    }
};

gulp.task('pack-app-js', function() {
    return browserify({
            basedir: '.',
            debug: true,
            entries: config.paths.jsToBundle,
            // cache: {},
            // packageCache: {}
        })
        // .transform('babelify', {
        //     presets: ['es2015'],
        //     extensions: ['.js']
        // })
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        // .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(config.paths.dist + "/js"))
        .pipe(browserSync.reload({
            stream: true
        }));
})

gulp.task('pack-compat-js', function() {
    return gulp.src(config.paths.jsToMove)
        .pipe(gulp.dest(config.paths.dist + "/js"))
        .pipe(browserSync.reload({
            stream: true
        }));
})

gulp.task("leaflet-bundling", function() {
    return gulp.src(config.paths.leaflet.assets)
        .pipe(gulp.dest(config.paths.dist + "/images"))
        .pipe(browserSync.reload({
            stream: true
        }))
})

gulp.task('pack-css', function() {
    return gulp.src(config.paths.css)
        .pipe(concat('bundle.css'))
        .pipe(cleanCss())
        .pipe(gulp.dest(config.paths.dist + "/css"))
        .pipe(browserSync.reload({
            stream: true
        }))
});

// basic build task.
gulp.task('build', ['pack-css', 'pack-app-js', 'pack-compat-js'])

//Run Flask server
gulp.task('runserver', function() {
    var proc = exec('python run.py');
});

gulp.task('browser-sync', ['runserver'], function() {
    browserSync({
        notify: false,
        proxy: "localhost:5000",
    });
});

// gulp.task('browserSync', function() {
//     browserSync.init({
//         server: {
//             baseDir: 'dist'
//         },
//     })
// })

gulp.task('watch', ['browser-sync', 'pack-css', 'pack-app-js', 'pack-compat-js'], function() {
    gulp.watch('src/css/*.css', ['pack-css']);
    gulp.watch('src/js/app/*.js', ['pack-app-js']);
    gulp.watch('src/js/compatibility/*.js', ['pack-compat-js']);
})

gulp.task("default", ["watch", "browser-sync"]);