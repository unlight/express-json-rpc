
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path');

var expressJsonRpc = require('./..');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  
  app.use(expressJsonRpc());

  // app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// app.get('/', routes.index);
// app.get('/users', user.list);

app.all('/api', function(req, res, next) {

  res.rpc('intMyFail', function(params, respond) {
    // throw new Error("Foooo");
    throw new expressJsonRpc.InvalidParamsError();
    respond(); //todo;
  });

  res.rpc('intFail', function(params, respond) {
    throw new Error("This is error.");
  });

  res.rpc('microtime', function(params, respond) {
    var now = (new Date()).getTime() / 1000;
    return now;
  });
  
  res.rpc('sum', function(params, respond) {
    console.log('Sum function, params: ', params);
    var result = params[0] + params[1];
    console.log('Result: ', result);
    respond({result: result});
  });


  res.rpc('filecontent', function(params, respond) {
    var fs = require('fs');
    fs.readFile(__filename, function(error, data) {
      respond(data.length);
    });
  });
});


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
