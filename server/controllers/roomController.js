// Controlador para gerenciar salas
const Room = require('../models/Room');

class RoomController {
    constructor() {
        // Armazenamento em memória para as salas (em produção, usaria um banco de dados como MongoDB)
        this.rooms = new Map();
    }

    // Criar uma nova sala
    async createRoom(roomId, socketId, username) {
        const newRoom = new Room(roomId);
        
        // Adicionar o criador como primeiro usuário
        newRoom.users.push({
            socketId: socketId,
            username: username,
            isHost: true
        });
        
        // Armazenar sala
        this.rooms.set(roomId, newRoom);
        
        return newRoom;
    }

    // Obter sala por ID
    async getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    // Obter salas por ID de socket do usuário
    async getRoomsByUserId(socketId) {
        const userRooms = [];
        
        for (const room of this.rooms.values()) {
            const userExists = room.users.some(user => user.socketId === socketId);
            
            if (userExists) {
                userRooms.push(room);
            }
        }
        
        return userRooms;
    }

    // Adicionar usuário à sala
    async addUserToRoom(roomId, socketId, username) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Sala não encontrada');
        }
        
        // Verificar se o usuário já está na sala
        const existingUserIndex = room.users.findIndex(user => user.socketId === socketId);
        
        if (existingUserIndex !== -1) {
            // Atualizar nome de usuário se já existir
            room.users[existingUserIndex].username = username;
        } else {
            // Adicionar novo usuário
            room.users.push({
                socketId: socketId,
                username: username,
                isHost: false
            });
        }
        
        return room;
    }

    // Remover usuário da sala
    async removeUserFromRoom(roomId, socketId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            return false;
        }
        
        // Remover usuário
        room.users = room.users.filter(user => user.socketId !== socketId);
        
        // Se não houver mais usuários, remover a sala
        if (room.users.length === 0) {
            this.rooms.delete(roomId);
            return true;
        }
        
        // Se o host saiu, atribuir host para o próximo usuário
        if (!room.users.some(user => user.isHost) && room.users.length > 0) {
            room.users[0].isHost = true;
        }
        
        return true;
    }

    // Adicionar faixa à playlist
    async addTrackToPlaylist(roomId, track) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Sala não encontrada');
        }
        
        // Verificar se a faixa já existe na playlist (pelo ID)
        const existingTrackIndex = room.playlist.findIndex(t => t.id === track.id);
        
        if (existingTrackIndex !== -1) {
            // Se a faixa já existe, substituí-la
            room.playlist[existingTrackIndex] = track;
        } else {
            // Adicionar nova faixa
            room.playlist.push(track);
        }
        
        return room;
    }

    // Remover faixa da playlist
    async removeTrackFromPlaylist(roomId, trackId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Sala não encontrada');
        }
        
        // Filtrar a playlist para remover a faixa
        room.playlist = room.playlist.filter(track => track.id !== trackId);
        
        // Se a faixa atual foi removida, limpar referência
        if (room.currentTrackId === trackId) {
            room.currentTrackId = null;
        }
        
        return room;
    }

    // Definir faixa atual
    async setCurrentTrack(roomId, trackId) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Sala não encontrada');
        }
        
        // Verificar se a faixa existe na playlist
        const trackExists = room.playlist.some(track => track.id === trackId);
        
        if (!trackExists) {
            throw new Error('Faixa não encontrada na playlist');
        }
        
        // Atualizar faixa atual
        room.currentTrackId = trackId;
        
        return room;
    }

    // Definir modo de loop
    async setLoopMode(roomId, mode) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            throw new Error('Sala não encontrada');
        }
        
        // Validar modo de loop
        if (!['no-loop', 'single-loop', 'playlist-loop'].includes(mode)) {
            throw new Error('Modo de loop inválido');
        }
        
        // Atualizar modo de loop
        room.loopMode = mode;
        
        return room;
    }

    // Limpar salas inativas (método para ser chamado periodicamente)
    async cleanupInactiveRooms(maxInactiveTime = 3600000) { // Padrão: 1 hora
        const now = Date.now();
        
        for (const [roomId, room] of this.rooms.entries()) {
            const inactiveTime = now - room.lastActivity;
            
            // Remover salas inativas
            if (inactiveTime > maxInactiveTime) {
                this.rooms.delete(roomId);
                console.log(`Sala inativa removida: ${roomId}`);
            }
        }
    }
}

module.exports = RoomController;