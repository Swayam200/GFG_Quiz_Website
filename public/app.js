const socket = io();
let currentQuestionIndex = 0;

function initHost() {
    const startQuizBtn = document.getElementById('start-quiz');
    const roomCodeInput = document.getElementById('room-code');

    startQuizBtn.addEventListener('click', () => {
        const roomCode = roomCodeInput.value.trim();
        if (roomCode) {
            socket.emit('start-quiz', roomCode);
            startQuizBtn.disabled = true;
        }
    });

    socket.on('leaderboard-update', updateLeaderboard);
}

function initPlayer() {
    const joinScreen = document.getElementById('join-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const joinBtn = document.getElementById('join-quiz');
    const playerNameInput = document.getElementById('player-name');
    const roomCodeInput = document.getElementById('room-code');

    joinBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        const roomCode = roomCodeInput.value.trim();
        if (playerName && roomCode) {
            socket.emit('join-quiz', { playerName, roomCode });
            joinScreen.style.display = 'none';
            quizScreen.style.display = 'block';
        }
    });

    socket.on('quiz-started', ({ questions }) => {
        displayQuestion(questions[currentQuestionIndex]);
    });

    socket.on('leaderboard-update', updateLeaderboard);
}

function displayQuestion(question) {
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');

    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.textContent = option;
        button.className = 'option-btn';
        button.addEventListener('click', () => submitAnswer(index));
        optionsContainer.appendChild(button);
    });
}

function submitAnswer(answerIndex) {
    socket.emit('submit-answer', {
        questionIndex: currentQuestionIndex,
        answer: answerIndex
    });

    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
        socket.emit('quiz-completed');
    } else {
        displayQuestion(questions[currentQuestionIndex]);
    }
}

function updateLeaderboard(players) {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';

    const sortedPlayers = players.sort((a, b) => b.score - a.score);

    sortedPlayers.forEach(player => {
        const li = document.createElement('li');
        li.textContent = `${player.name}: ${player.score} points`;
        if (player.completed) {
            li.textContent += ' (Completed)';
        }
        leaderboardList.appendChild(li);
    });
}