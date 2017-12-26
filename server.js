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

	// Get ref messages db
	const messagesRef = database.ref('messages');

	// Get messages once
	messagesRef.once('value', function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			const data = childSnapshot.val();
			let message = JSON.stringify({
				message: data.message,
				user: data.user,
				photo: data.photo
			});
			ws.send(message);
		});
	});

	ws.on('message', function incoming(msg) {
		const parsedMsg = JSON.parse(msg);
		const clients = wss.clients;
		const newMsgRef = firebase.database().ref('messages').push();
		msg.id = newMsgRef.key;

		newMsgRef.set({
			message: parsedMsg.message,
			user: parsedMsg.user,
			photo: parsedMsg.photo
		});

		let message = JSON.stringify({
			message: parsedMsg.message,
			user: parsedMsg.user,
			photo: parsedMsg.photo
		});

		clients.forEach(client => {
			client.send(message);
		});
  });
});

server.listen(3000, function listening() {
  console.log('Listening on %d', server.address().port);
});
