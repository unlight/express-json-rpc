var rest = require('restler');

var jsonData = { 
	id: 2,
	jsonrpc: "2.0",
	method: 'divideOnFive',
	params: 45
};

var resp = rest.postJson('http://localhost:3000/api', jsonData);

resp.on('complete', function(json, response) {
	console.log(json);
});

