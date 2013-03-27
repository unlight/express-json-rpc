var rest = require('restler');

var jsonData = { 
	id: 9,
	jsonrpc: "2.0",
	method: 'intMyFail',
	params: {
		"a": 1
	}
};

var resp = rest.postJson('http://localhost:3000/api', jsonData);

resp.on('complete', function(json, response) {
	console.log(json);
});

