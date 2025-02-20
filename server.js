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
        question: "I travel the world but always stay in my corner. What am I?",
        options: ["A map", "A compass", "A stamp", "A postcard"],
        correct: 2,
        hint: "I'm often found on letters and envelopes."
    },
    {
        question: "What technology uses electromagnetic fields to transfer power wirelessly to devices like smartphones and electric vehicles?",
        options: ["Solar Charging", "Wireless Charging", "Inductive Cabling", "Magnetron Power"],
        correct: 1,
        hint: "I remove the need for physical cables to charge devices."
    },
    {
        question: "When you're lost, I'll show your location on a map. I'll give you turn-by-turn directions to get you back on track. What am I?",
        options: ["Compass", "Odometer", "GPS Navigation", "Altimeter"],
        correct: 2,
        hint: "I rely on satellites to guide you."
    },
    {
        question: "I let you type, create spreadsheets, make presentations, and more. I'm the main set of programs you use on a computer. What am I?",
        options: ["Web Browser", "Office Productivity Software", "Database Management System", "Code Editor"],
        correct: 1,
        hint: "I include tools like Word, Excel, and PowerPoint."
    },
    {
        question: "I'm billions of pages filled with information. I'm one giant collection of websites. What am I?",
        options: ["The Internet", "The Cloud", "The World Wide Web", "A Search Engine"],
        correct: 2,
        hint: "I was invented by Tim Berners-Lee in 1989."
    },
    {
        question: "I'm a messaging app that lets you chat in groups or privately. You can even video call friends all over the world. What am I?",
        options: ["Youtube", "VTOP", "WhatsApp", "Twitter/X"],
        correct: 2,
        hint: "I use end-to-end encryption for security."
    },
    {
        question: "I store code snippets that programmers can reuse instead of writing from scratch. I help boost productivity. What am I?",
        options: ["GitHub", "HackerRank", "Bitbucket", "Jira"],
        correct: 0,
        hint: "I'm a popular version control repository hosting service."
    },
    {
        question: "I'm a social network pioneer who co-founded Facebook. My name rhymes with 'lark.' Who am I?",
        options: ["Elon Musk", "Mark Zuckerberg", "Jeff Bezos", "Bill Gates"],
        correct: 1,
        hint: "I launched my social media empire from a college dorm room."
    },
    {
        question: "I'm thin, flat, and rectangular. I fit in your pocket and let you talk to, text, or video chat anyone in the world. What am I?",
        options: ["Tablet", "Mobile Phone", "Smartwatch", "Landline"],
        correct: 1,
        hint: "Nearly everyone owns one of me today."
    },
    {
        question: "I hold your secrets, day and night. In my grasp, they are kept out of sight. I am always near, a click away. What am I that keeps data safe?",
        options: ["Flashlight", "Password", "Camera", "Padlock"],
        correct: 1,
        hint: "I am often a combination of letters, numbers, and symbols."
    },
    {
        question: "I am a space where you can interact and play, in a simulated world where you can stay. I offer adventures and experiences to explore. What am I that provides a digital door?",
        options: ["Virtual Reality", "Augmented Reality", "Metaverse", "Simulation Software"],
        correct: 0,
        hint: "I require a headset for full immersion."
    },
    {
        question: "I bridge the gap between different systems, enabling data transfer and seamless rhythms. I am essential for interoperability’s key. What am I that links with technology?",
        options: ["API (Application Programming Interface)", "Protocol", "Middleware", "Gateway"],
        correct: 0,
        hint: "I allow different software applications to communicate."
    },
    {
        question: "I am born of logic but thrive on emotion. I can mimic thought but have no soul. What am I?",
        options: ["Neural Network", "Artificial Intelligence", "Chatbot", "Supercomputer"],
        correct: 1,
        hint: "I am at the core of modern automation and smart assistants."
    },
    {
        question: "I am the ephemeral ghost in the machine, fleeting yet crucial. I am created and destroyed in milliseconds, yet upon me rests the performance of the whole. What am I?",
        options: ["Cache Memory", "SSD", "RAM", "Cloud Storage"],
        correct: 2,
        hint: "I am a type of volatile memory that loses data when powered off."
    },
    {
        question: "I am the embodiment of intelligent automation, capable of learning and adapting to new environments. I mimic human cognitive abilities and perform complex tasks, but my sentience is purely simulated. What am I?",
        options: ["ChatGPT", "Neural Network", "A Deep Learning Model", "Quantum Computer"],
        correct: 2,
        hint: "I am the foundation of modern AI-driven breakthroughs."
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
