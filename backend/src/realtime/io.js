let _io = null;

export function setIo(io) {
  _io = io;
}

export function getIo() {
  return _io;
}

export function roomUser(userId) {
  return `user:${String(userId)}`;
}

export function roomRide(rideId) {
  return `ride:${String(rideId)}`;
}

export function roomDrivers(vehicleType) {
  return `drivers:${String(vehicleType || "delivery").toLowerCase()}`;
}

export function emitTo(room, event, payload) {
  if (!_io) return;
  _io.to(room).emit(event, payload);
}

