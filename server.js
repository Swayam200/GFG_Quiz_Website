const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const ROOM_CODE = 'CARNIVAL';
const playerData = new Map();
let isActive = false;

const questions = [
    {
        question: "I compute but do not think. I am the heart of every PC. What am I?",
        options: ["CPU", "RAM", "GPU", "Motherboard"],
        correct: 0,
        hint: "I execute instructions and perform arithmetic."
    },
    {
        question: "I store data temporarily, but lose everything when power is off. What am I?",
        options: ["Hard Drive", "SSD", "RAM", "Cache"],
        correct: 2,
        hint: "I'm volatile memory."
    },
    {
        question: "I am a permanent storage device that spins and stores your digital memories. What am I?",
        options: ["SSD", "Hard Disk Drive", "RAM", "CD-ROM"],
        correct: 1,
        hint: "I have moving parts and magnetic platters."
    },
    {
        question: "I am a small chip that temporarily holds data for quick access by your CPU. What am I?",
        options: ["Cache", "BIOS", "GPU", "RAM"],
        correct: 0,
        hint: "I improve speed by storing frequently accessed data."
    },
    {
        question: "I am the language that computers understand at the lowest level. What am I?",
        options: ["Assembly", "Python", "JavaScript", "HTML"],
        correct: 0,
        hint: "I am used to write low-level instructions."
    },
    {
        question: "I am the protocol that secures websites, making sure your data is encrypted. What am I?",
        options: ["HTTP", "FTP", "SSL", "SMTP"],
        correct: 2,
        hint: "I provide a secure connection between server and client."
    },
    {
        question: "I translate high-level code into machine language. What am I?",
        options: ["Interpreter", "Compiler", "Assembler", "Linker"],
        correct: 1,
        hint: "I convert source code into an executable."
    },
    {
        question: "I am a network of networks, connecting computers globally. What am I?",
        options: ["LAN", "Internet", "Intranet", "Extranet"],
        correct: 1,
        hint: "I enable worldwide communication."
    },
    {
        question: "I am a device that modulates and demodulates digital signals. What am I?",
        options: ["Modem", "Router", "Switch", "Hub"],
        correct: 0,
        hint: "I translate digital data into analog signals."
    },
    {
        question: "I manage IP addresses and direct traffic on a network. What am I?",
        options: ["Switch", "Router", "Bridge", "Repeater"],
        correct: 1,
        hint: "I determine the best path for data packets."
    },
    {
        question: "I am non-volatile memory used in smartphones to store apps and data. What am I?",
        options: ["RAM", "ROM", "SSD", "Cache"],
        correct: 1,
        hint: "I store firmware and persistent data."
    },
    {
        question: "I help you find and fix errors in your code by stepping through it. What am I?",
        options: ["Debugger", "Compiler", "Interpreter", "Profiler"],
        correct: 0,
        hint: "I help you locate bugs in your code."
    },
    {
        question: "I am a virtual copy of a physical server, offering flexible resources. What am I?",
        options: ["Cloud", "Virtual Machine", "Container", "Cluster"],
        correct: 1,
        hint: "I emulate a physical computer in software."
    },
    {
        question: "I am a lightweight, portable package that contains everything needed to run an application. What am I?",
        options: ["Container", "Virtual Machine", "Serverless Function", "Cloud Service"],
        correct: 0,
        hint: "I isolate applications from the environment."
    },
    {
        question: "I ensure your network is safe by blocking unauthorized access. What am I?",
        options: ["Router", "Switch", "Firewall", "Modem"],
        correct: 2,
        hint: "I monitor and control incoming and outgoing traffic."
    }
];

initCarnivalRoom();

function initCarnivalRoom() {
    console.log('Initializing carnival room:', ROOM_CODE);
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('create-room', () => {
            socket.join(ROOM_CODE);
            socket.emit('room-created', ROOM_CODE);
            updateLeaderboard();
        });

        socket.on('start-quiz', () => {
            console.log('Starting quiz in carnival room');
            isActive = true;
            io.to(ROOM_CODE).emit('quiz-started', { questions });
        });

        socket.on('join-quiz', ({ playerName, isReconnect }) => {
            console.log('Player joining:', playerName);
            // If not a reconnect and a player with the same name exists, deny the join
            if (!isReconnect && playerData.has(playerName)) {
                socket.emit('join-error', 'Name already in use. Please choose a different name.');
                return;
            }

            if (!playerData.has(playerName)) {
                playerData.set(playerName, {
                    socketId: socket.id,
                    name: playerName,
                    score: 0,
                    completed: false,
                    currentQuestion: 0,
                    answers: {}
                });
            } else {
                // For reconnect, update the socket id.
                const player = playerData.get(playerName);
                player.socketId = socket.id;
            }
            socket.join(ROOM_CODE);

            const player = playerData.get(playerName);
            socket.emit('joined-successfully', {
                questions,
                isActive,
                currentQuestion: player.currentQuestion,
                score: player.score
            });
            updateLeaderboard();
        });

        socket.on('submit-answer', ({ questionIndex, answer, timeSpent }) => {
            const player = findPlayerBySocketId(socket.id);
            if (!player || player.currentQuestion !== questionIndex) return;

            const correctAnswer = questions[questionIndex].correct;
            let earnedPoints = 0;
            // New scoring: maximum of 30 points, subtracting 1 point per second taken.
            if (answer === correctAnswer) {
                earnedPoints = Math.max(0, 30 - timeSpent);
                console.log(`Player ${player.name} got question ${questionIndex} correct in ${timeSpent}s! Points: ${earnedPoints}`);
            } else {
                console.log(`Player ${player.name} got question ${questionIndex} wrong. Answer was ${correctAnswer}, they chose ${answer}`);
            }

            if (!player.answers.hasOwnProperty(questionIndex)) {
                player.answers[questionIndex] = earnedPoints;
                player.score += earnedPoints;
                player.currentQuestion++;

                io.to(socket.id).emit('question-update', {
                    score: player.score,
                    currentQuestion: player.currentQuestion
                });
                updateLeaderboard();
            }
        });

        socket.on('quiz-completed', () => {
            const player = findPlayerBySocketId(socket.id);
            if (player) {
                player.completed = true;
                updateLeaderboard();
            }
        });

        socket.on('time-expired', ({ questionIndex }) => {
            const player = findPlayerBySocketId(socket.id);
            if (player && !player.answers.hasOwnProperty(questionIndex)) {
                player.answers[questionIndex] = 0;
                player.currentQuestion++;
                io.to(socket.id).emit('question-update', {
                    currentQuestion: player.currentQuestion
                });
                updateLeaderboard();
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });

        function findPlayerBySocketId(socketId) {
            return [...playerData.values()].find(player => player.socketId === socketId);
        }

        function updateLeaderboard() {
            const players = Array.from(playerData.values()).map(p => ({
                name: p.name,
                score: p.score,
                completed: p.completed
            }));
            io.to(ROOM_CODE).emit('leaderboard-update', players);
        }
    });
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
