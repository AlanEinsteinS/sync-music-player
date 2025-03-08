// Modelo para representar uma sala de reprodução
class Room {
    constructor(roomId) {
        this.roomId = roomId;
        this.playlist = [];
        this.currentTrackId = null;
        this.users = [];
        this.loopMode = 'no-loop'; // 'no-loop', 'single-loop', 'playlist-loop'
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
    }

    // Atualizar timestamp de última atividade
    updateActivity() {
        this.lastActivity = Date.now();
    }
}

module.exports = Room;