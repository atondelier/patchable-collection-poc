var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var jsonpatch = require('fast-json-patch');
var _ = require('lodash');

var routes = require('./routes');
var users = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

app.get('/', routes.index);
app.get('/users', users.list);


var ReservationList = [
    {
        id_reservation: 123456,
        firstName: 'Test',
        lastName: 'Test'
    },
    {
        id_reservation: 123457,
        firstName: 'Test',
        lastName: 'Test'
    }
];

function getResertionById(id_reservation) {
    return _.find(ReservationList, function(reservation) {
        return reservation.id_reservation == id_reservation;
    });
}

app.get('/reservations', function(req, res, next) {
    res.end(JSON.stringify(ReservationList));
});

app.patch('/reservations', function(req, res, next) {
    var patches = req.body;
    console.log(patches);
    patches.forEach(function(patch) {
        var reservation = getResertionById(patch.id_reservation) ;
        if(reservation) {
            jsonpatch.apply(reservation, [patch]);
            console.log('existing reservation', reservation);
        } else {
            reservation = {};
            jsonpatch.apply(reservation, [patch]);
            console.log('new reservation', reservation);
            ReservationList.push(reservation);
        }
    });
    res.end();
});

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
