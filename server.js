const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// Game state
const gameRooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Host creates a room
    socket.on('create-room', (roomCode) => {
        console.log('Room created:', roomCode);
        gameRooms.set(roomCode, {
            players: new Map(),
            isActive: false,
            questions: [
                {
                    question: "What is 2 + 2?",
                    options: ["3", "4", "5", "6"],
                    correct: 1
                },
                {
                    question: "What is the capital of France?",
                    options: ["London", "Berlin", "Paris", "Madrid"],
                    correct: 2
                }
            ]
        });
        socket.join(roomCode);
        socket.emit('room-created', roomCode);
    });

    // Host starts the quiz
    socket.on('start-quiz', (roomCode) => {
        console.log('Starting quiz in room:', roomCode);
        const room = gameRooms.get(roomCode);
        if (room) {
            room.isActive = true;
            io.to(roomCode).emit('quiz-started', {
                questions: room.questions
            });
        }
    });

    // Player joins
    socket.on('join-quiz', ({ playerName, roomCode }) => {
        console.log('Player joining:', playerName, 'Room:', roomCode);
        const room = gameRooms.get(roomCode);
        if (room) {
            socket.join(roomCode);
            room.players.set(socket.id, {
                name: playerName,
                score: 0,
                completed: false
            });

            // Send current state to the new player
            socket.emit('joined-successfully', {
                questions: room.questions,
                isActive: room.isActive
            });

            // Update everyone's leaderboard
            const playersArray = Array.from(room.players.values());
            io.to(roomCode).emit('leaderboard-update', playersArray);
        } else {
            socket.emit('join-error', 'Room not found');
        }
    });

    // Handle answer submission
    socket.on('submit-answer', ({ roomCode, questionIndex, answer }) => {
        const room = gameRooms.get(roomCode);
        if (room && room.players.has(socket.id)) {
            const player = room.players.get(socket.id);
            if (answer === room.questions[questionIndex].correct) {
                player.score += 10;
            }

            const playersArray = Array.from(room.players.values());
            io.to(roomCode).emit('leaderboard-update', playersArray);
        }
    });

    socket.on('disconnect', () => {
        gameRooms.forEach((room, roomCode) => {
            if (room.players.has(socket.id)) {
                room.players.delete(socket.id);
                const playersArray = Array.from(room.players.values());
                io.to(roomCode).emit('leaderboard-update', playersArray);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});