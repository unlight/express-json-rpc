
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var expressJsonRpc = require('./express-json-rpc');
var isNumeric = require('useful-functions.js').isNumeric;
var app = express();

app.configure(function(){
	app.set('port', process.env.PORT || 3000);
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());

	app.use(expressJsonRpc());

	// app.use(app.router);
});

app.configure('development', function(){
	app.use(express.errorHandler());
});

// app.get('/', routes.index);
// app.get('/users', user.list);

app.all('/api', function(req, res, next) {

	/**
	 * Gets server microtime.
	 */
	res.rpc('microtime', function(params, respond) {
		var now = (new Date()).getTime() / 1000;
		return now;
	});
	
	/**
	 * Sum all arguments.
	 */
	res.rpc('sum', function(params, respond) {
		var result = 0;
		for (var i in params) {
			var value = params[i];
			if (!isNumeric(value)) {
				throw new expressJsonRpc.InvalidParamsError();
			}
			result += value;
		}
		respond(result);
	});

	/**
	 * Returns IP address.
	 */
	res.rpc('ip', function(params, respond) {
		var getIpAddress = require('useful-functions.js').getIpAddress;
		var ip = getIpAddress(req);
		return ip;
	});

});


http.createServer(app).listen(app.get('port'), function(){
	console.log("Express server listening on port " + app.get('port'));
});
