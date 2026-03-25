import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io('http://localhost:5006', {
    auth:  { token },
    query: { token }
  });

  socket.on('connect', () => {
    console.log('Socket connecté :', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket déconnecté');
  });

  socket.on('connect_error', (err) => {
    console.error('Erreur Socket :', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};