const http = require('http');
const socketio = require('socket.io');
const { openRoom, joinRoom, closeRoom } = require('./utils/db');

const server = http.createServer();
const io = socketio(server);
const port = process.env.PORT || 5000;

io.origins('*:*');

const users = {};

const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', async (roomID) => {
    if (users[roomID]) {
      users[roomID].push(socket.id);
      await joinRoom(roomID);
    } else {
      users[roomID] = [socket.id];
      await openRoom(roomID);
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    socket.emit('all users', usersInThisRoom);
    usersInThisRoom.forEach((u) => socket.to(u).emit('user joined', socket.id));
  });

  socket.on('offer', (id, message) => {
    socket.to(id).emit('offer', socket.id, message);
  });

  socket.on('answer', (id, message) => {
    socket.to(id).emit('answer', socket.id, message);
  });

  socket.on('candidate', (id, message) => {
    socket.to(id).emit('candidate', socket.id, message);
  });

  socket.on('request mute', (id) => {
    socket.to(id).emit('request mute');
  });

  socket.on('update mute status', (senderId, status) => {
    const roomId = socketToRoom[senderId];
    const usersInThisRoom = users[roomId].filter((id) => id !== senderId);
    usersInThisRoom.forEach((u) =>
      socket.to(u).emit('report mute status', senderId, status)
    );
  });

  socket.on('request mute status', (senderId, receiverId) => {
    socket.to(receiverId).emit('request mute status', senderId);
  });

  socket.on('report mute status', (receiverId, senderId, status) => {
    socket.to(receiverId).emit('report mute status', senderId, status);
  });

  socket.on('disconnect', async () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
      room.forEach((u) => socket.to(u).emit('user left', socket.id));
      if (room.length === 0) {
        await closeRoom(roomID);
        delete users[roomID];
      }
      delete socketToRoom[socket.id];
    }
  });
});

server.listen(port, () => console.log(`server is running on port ${port}`));
