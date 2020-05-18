const http = require('http');
const socketio = require('socket.io');

const server = http.createServer();
const io = socketio(server);
const port = process.env.PORT || 5000;

io.origins('*:*');

const users = {};

const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join room', (roomID) => {
    if (users[roomID]) {
      console.log('JOINING ROOM');
      users[roomID].push(socket.id);
    } else {
      console.log('CREATING ROOM');
      users[roomID] = [socket.id];
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

  socket.on('shut up', (id) => {
    socket.to(id).emit('shut up');
  });

  socket.on('request all mute statuses', (requesterId) => {
    const roomId = socketToRoom[requesterId];
    const usersInThisRoom = users[roomId].filter((id) => id !== requesterId);
    usersInThisRoom.forEach((u) =>
      socket.to(u).emit('request mute status', requesterId)
    );
  });

  socket.on('update mute status', (senderId, status) => {
    const roomId = socketToRoom[senderId];
    const usersInThisRoom = users[roomId].filter((id) => id !== senderId);
    usersInThisRoom.forEach((u) =>
      socket.to(u).emit('user mute status', senderId, status)
    );
  });

  socket.on('request mute status', (senderId, receiverId) => {
    socket.to(receiverId).emit('request mute status', senderId);
  });

  socket.on('report mute status', (receiverId, senderId, status) => {
    socket.to(receiverId).emit('user mute status', senderId, status);
  });

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
      room.forEach((u) => socket.to(u).emit('user left', socket.id));
      if (room.length === 0) {
        console.log('CLOSING ROOM');
        delete users[roomID];
      } else {
        console.log('LEAVING ROOM');
      }
      delete socketToRoom[socket.id];
    }
  });
});

server.listen(port, () => console.log(`server is running on port ${port}`));
