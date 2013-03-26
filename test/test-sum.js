var rest = require('restler');

var jsonData = { 
	id: 18,
	jsonrpc: "2.0",
	method: 'sum',
	params: [1,2]
};

var resp = rest.postJson('http://localhost:3000/api', jsonData);

resp.on('complete', function(json, response) {
	console.log(json);
});

