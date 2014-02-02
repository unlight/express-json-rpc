"use strict";

var getValueR = require('useful-functions.js').getValueR;
var isNumeric = require('useful-functions.js').isNumeric;
var extend = require('useful-functions.js').extend;
var inherits = require('util').inherits;
var trim = require('useful-functions.js').trim;

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

function JsonRpcError(code, message) {
	this.constructor.prototype.__proto__ = Error.prototype
	Error.call(this, message);
	Error.captureStackTrace(this, this.constructor);
	this.name = "JsonRpcError";
	this.code = code || INTERNAL_ERROR;
	this.message = message || getValueR(this.code + ".text", ERRORS, "");
	this.toString = function() {
		return this.name + ": " + this.message;
	}
}

// JsonRpcError.prototype = new Error();
// JsonRpcError.prototype.constructor = JsonRpcError;

inherits(JsonRpcError, Error);

function InvalidParamsError(message) {
	JsonRpcError.call(this, INVALID_PARAMS, message);
	this.name = "InvalidParamsError";
}

inherits(InvalidParamsError, JsonRpcError);


function MethodNotFoundError(message) {
	JsonRpcError.call(this, METHOD_NOT_FOUND, message);
	this.name = "MethodNotFoundError";
}
inherits(MethodNotFoundError, JsonRpcError);

var methodCollection = {};

var nullFunction = function() {
	return null;
};

var zeroFunction = function() {
	return 0;
}

function addMethod(name, func) {
	if (typeof methodCollection[name] == "undefined") {
		methodCollection[name] = func;
	}
}

function makeErrorObject(error) {
	var object = {};
	if (error instanceof JsonRpcError) {
		object.code = error.code;
		object.message = error.message;
		// object.data = error.stack;
	} else if (error instanceof Error) {
		var text = ERRORS[INTERNAL_ERROR].text;
		error.code = INTERNAL_ERROR;
		object.message = text;
		if (error.message && error.message != text) {
			object.data = trim(error.message);
		}
		// object.data = error.stack;
	} else if (isNumeric(error) && typeof ERRORS[error] != "undefined") {
		extend(object, ERRORS[error]);
		extend(object, {code: error});
	} else {
		throw "Unrecognized: " + require('util').inspect(error);
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
		var object = {
			id: id, 
			jsonrpc: "2.0"
		};
		return function(result, error) {
			// var error = error || errorReference;
			if (error) {
				object.error = makeErrorObject(error);
			} else {
				object.result = result;
			}
			outputResponse(object);
			respond = nullFunction;
		}
	})();

	if (typeof method != "function") {
		respond(null, METHOD_NOT_FOUND);
		return;
	}

	var result;
	try {
		result = method(params, respond);
	} catch (e) {
		respond(null, e);
	}
	
	// console.log('Result (Server):', result);

	if (result != null) {
		respond(result);
	}
}

module.exports = function() {
	return expressRequestHandler;
}

module.exports.InvalidParamsError = InvalidParamsError;
module.exports.MethodNotFoundError = MethodNotFoundError;