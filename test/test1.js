var wru = require('wru');
var inspect = require('util').inspect;
var rest = require('restler');

var jsonData;

wru.test([
	{
		name: "Post json data",
		setup: function() {
			jsonData = { 
				id: 1,
				jsonrpc: "2.0",
				method: 'sum',
				params: [1,2,3]
			};
		},
		test: function() {
			var resp = rest.postJson('http://localhost:3000/api', jsonData);
			resp.on('complete', wru.async(function (json) {
				wru.assert("Sum result", json.result == 6);
			}));
		}
	}
]);
