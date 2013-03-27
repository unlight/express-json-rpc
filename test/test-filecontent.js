var rest = require('restler');

var jsonData = { 
	id: 3,
	jsonrpc: "2.0",
	method: 'filecontent',
	params: {
	}
};

var resp = rest.postJson('http://localhost:3000/api', jsonData);

resp.on('complete', function(json, response) {
	console.log(json);
});

