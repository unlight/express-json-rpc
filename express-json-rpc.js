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

function addMethod(name, func) {
	if (typeof methodCollection[name] == "undefined") {
		methodCollection[name] = func;
	}
}

function errorObject(value) {
	var object = respondObject(null);
	if (isNumeric(value) && typeof ERRORS[value] != "undefined") {
		extend(object, ERRORS[value]);
		extend(object, {code: value});
	} else {
		throw "Cannot create errorObject. " + arguments;
	}
	return object;
}

var respondObject = function(value) {
	var object = {jsonrpc: "2.0"};
	if (value !== null) {
		object.result = value;
	}
	return object;
}

function writeResponse(response, output) {
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
	var contentType = getValueR("headers.content-type", request, '');
	if (contentType.indexOf("application/json") === 0) {
		var jsonRequest = request.body;
	} else {
		throw "Other request. " + request.headers;
	}
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
	
	// if (typeof method != "function" && !isNotification) {
	// 	var object = errorObject(METHOD_NOT_FOUND);
	// 	object.id = id;
	// 	writeResponse(response, JSON.stringify(object));
	// 	return;
	// }

	if (isNotification) {
		return;
	}

	var respond = function(result) {
		var object = respondObject(result);
		object.id = id;
		var output = JSON.stringify(object);
		writeResponse(response, output);
	};

	method(params, respond);
}

module.exports = function() {
	return expressRequestHandler;
}