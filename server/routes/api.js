// Rotas da API
const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/roomController');

// Instância do controlador de salas
const roomController = new RoomController();

// Rota para obter informações de uma sala
router.get('/rooms/:roomId', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const room = await roomController.getRoom(roomId);
        
        if (!room) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        // Retornar informações da sala (exceto dados sensíveis)
        res.json({
            roomId: room.roomId,
            playlist: room.playlist,
            currentTrackId: room.currentTrackId,
            userCount: room.users.length,
            loopMode: room.loopMode,
            createdAt: room.createdAt
        });
    } catch (error) {
        console.error('Erro ao obter sala:', error);
        res.status(500).json({ error: 'Erro ao obter informações da sala' });
    }
});

// Rota para verificar se uma sala existe
router.get('/rooms/:roomId/exists', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const room = await roomController.getRoom(roomId);
        
        res.json({ exists: !!room });
    } catch (error) {
        console.error('Erro ao verificar sala:', error);
        res.status(500).json({ error: 'Erro ao verificar sala' });
    }
});

// Rota para obter a playlist de uma sala
router.get('/rooms/:roomId/playlist', async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const room = await roomController.getRoom(roomId);
        
        if (!room) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        res.json({ playlist: room.playlist });
    } catch (error) {
        console.error('Erro ao obter playlist:', error);
        res.status(500).json({ error: 'Erro ao obter playlist' });
    }
});

// Rota de saúde para verificar se o servidor está funcionando
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;