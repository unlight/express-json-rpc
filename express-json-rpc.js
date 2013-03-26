"use strict";

var getValueR = require('useful-functions.js').getValueR;
var isNumeric = require('useful-functions.js').isNumeric;
var extend = require('useful-functions.js').extend;

var PARSE_ERROR = -32700;
var INVALID_REQUEST = -32600;
var METHOD_NOT_FOUND = -32601;
var INVALID_PARAMS = -32602;
var INTERNAL_ERROR = -32603;

// http://www.jsonrpc.org/specification
var ERRORS = {
	"-32700": {
		message: "Parse error",
		text: "Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text."
	},
	"-32600": {
		message: "Invalid Request",
		text: "The JSON sent is not a valid Request object."
	},
	"-32601": {
		message: "Method not found",
		text: "The method does not exist / is not available."
	},
	"-32602": {
		message: "Invalid params",
		text: "Invalid method parameter(s)."
	},
	"-32603": {
		message: "Internal error",
		text: "Internal JSON-RPC error."
	}
};
// -32000 to -32099 	Server error 	Reserved for implementation-defined server-errors.
for (var code in ERRORS) {
	ERRORS[code]['code'] = parseInt(code, 10);
}

var methodCollection = {};

var nullFunction = function() {
	return null;
};

function addMethod(name, func) {
	if (typeof methodCollection[name] == "undefined") {
		methodCollection[name] = func;
	}
}

var respondObject = function(value, error) {
	var object = {jsonrpc: "2.0"};
	if (typeof value == "object" && value instanceof Error) {
		var text = ERRORS[INTERNAL_ERROR].text;
		object.code = INTERNAL_ERROR;
		object.message = text;
		object.data = value.message;
		// object.data = value.stack;
	} else if (isNumeric(error) && typeof ERRORS[error] != "undefined") {
		extend(object, ERRORS[error]);
		extend(object, {code: error});
	} else {
		object.result = value;
	}
	return object;
}

function getJsonRequest(request) {
	var contentType = getValueR("headers.content-type", request, '');
	if (contentType.indexOf("application/json") === 0) {
		var jsonRequest = request.body;
	} else {
		throw "Other request. " + request.headers;
	}
	return jsonRequest;
}

function writeResponse(response, object) {
	var output = JSON.stringify(object);
	response.writeHead(200, {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(output || "")
		}
	);
	response.end(output);
}

function expressRequestHandler(request, response, next) {
	response.rpc = addMethod;
	next();
	var jsonRequest = getJsonRequest(request);
	if (jsonRequest["jsonrpc"] !== "2.0") {
		// Not a JSON-RPC request.
		next();
		return;
	}
	var methodName = jsonRequest["method"];
	var id = jsonRequest["id"];
	var params = jsonRequest["params"];

	var isNotification = (typeof id == "undefined");
	var method = methodCollection[methodName];

	var outputResponse = writeResponse.bind(null, response);

	var respond = (function() {
		if (isNotification) {
			return nullFunction;
		}
		var object = {id: id};
		if (typeof method != "function") {
			method = nullFunction;
			extend(object, respondObject(null, METHOD_NOT_FOUND));
		}
		return function(result) {
			extend(object, respondObject(result));
			outputResponse(object);
			respond = nullFunction;
		}
	})();

	if (typeof respond != "function") {
		outputResponse(respondObject(null, INTERNAL_ERROR));
		return;
	}

	try {
		var result = method(params, respond);
	} catch (e) {
		console.log('Fatal error:', e.message);
		outputResponse(respondObject(null, e));
	}
	
	console.log('Result:', result);

	if (typeof result !== "undefined") {
		respond(result);
	}
}

module.exports = function() {
	return expressRequestHandler;
}