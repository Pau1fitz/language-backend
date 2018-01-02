require('dotenv').config();
const express = require('express');
const http = require('http');
const url = require('url');
const firebase = require("firebase");
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
	server,
	clientTracking: true
});

const config = {
	apiKey: process.env.apiKey,
	authDomain: process.env.authDomain,
	databaseURL: process.env.databaseURL,
	storageBucket: process.env.storageBucket
};

firebase.initializeApp(config);
// Get a reference to the database service
const database = firebase.database();

wss.on('connection', function connection(ws, req) {

	console.log('device connected')

	// Get ref messages db
	const messagesRef = database.ref('messages');

	ws.on('message', function incoming(msg) {

		const parsedMsg = JSON.parse(msg);

		if(parsedMsg.userId) {

			const messagesRef = database.ref('messages');

			messagesRef.child(parsedMsg.userId).child(parsedMsg.otherUserId).once('value', function(snapshot) {
				snapshot.forEach(function(childSnapshot) {
					const data = childSnapshot.val();

					let message = JSON.stringify({
						_id: data._id,
						text: data.text,
						createdAt: data.createdAt,
						user: {
							_id: data.user._id,
							name: data.user.name,
							avatar: data.user.avatar,
						}
					});
					ws.send(message);
				});
			});

		} else {

			const clients = wss.clients;
			const newMsgRef = firebase.database().ref('messages');

			newMsgRef.child(parsedMsg.user._id).child(parsedMsg.otherUserId).push({
				_id: parsedMsg._id,
	 			text: parsedMsg.text,
	 			createdAt: parsedMsg.createdAt,
	 			user: {
	 				_id: parsedMsg.user._id,
	 				name: parsedMsg.user.name,
	 				avatar: parsedMsg.user.avatar,
	 			}
			});

			let message = JSON.stringify({
				_id: parsedMsg._id,
				text: parsedMsg.text,
				createdAt: parsedMsg.createdAt,
				user: {
					_id: parsedMsg.user._id,
					name: parsedMsg.user.name,
					avatar: parsedMsg.user.avatar,
				}
			});

			clients.forEach(client => {
				client.send(message);
			});

		}

  });
});

app.get('/messages/:userId/:otherUserId', function(req, res) {

	const messagesRef = database.ref('messages');

	messagesRef.child(req.params.userId).child(req.params.otherUserId).once('value', function(snapshot) {

		const messages = [];

		snapshot.forEach(function(childSnapshot) {
			const data = childSnapshot.val();
			messages.push(data);
		});

		res.json(messages);
	});

});

server.listen(3000, function listening() {
  console.log('Listening on %d', server.address().port);
});
