const socket = io();

let currentQuestionIndex = 0;
let questions = []; // Store the questions
let score = 0;

function initHost() {
    const startQuizBtn = document.getElementById('start-quiz');
    const roomCodeInput = document.getElementById('room-code');

    startQuizBtn.addEventListener('click', () => {
        const roomCode = roomCodeInput.value.trim();
        if (roomCode) {
            socket.emit('start-quiz'); // Removed roomCode
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

    joinBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            socket.emit('join-quiz', { playerName });
            joinScreen.style.display = 'none';
            quizScreen.style.display = 'block';
        }
    });

    socket.on('quiz-started', (data) => {
        questions = data.questions; // Store the questions
        currentQuestionIndex = 0; // Reset question index
        score = 0; // Reset score
        displayQuestion(questions[currentQuestionIndex]);
    });

    socket.on('joined-successfully', (data) => {
        questions = data.questions;
        currentQuestionIndex = data.currentQuestion;
        score = data.score;
        if (questions && questions.length > 0) {
            displayQuestion(questions[currentQuestionIndex]);
        }
        updateScoreDisplay();
    });

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
            answer: answerIndex,
            timeSpent: 5 // example time
        });
    }

    socket.on('question-update', (data) => {
        score = data.score !== undefined ? data.score : score;
        currentQuestionIndex = data.currentQuestion !== undefined ? data.currentQuestion : currentQuestionIndex;
        updateScoreDisplay();

        if (currentQuestionIndex < questions.length) {
            displayQuestion(questions[currentQuestionIndex]);
        } else {
            socket.emit('quiz-completed');
            displayCompletionMessage();
        }
    });

    function displayCompletionMessage() {
        const quizScreen = document.getElementById('quiz-screen');
        quizScreen.innerHTML = `<h2>Quiz Completed!</h2><p>Your final score: ${score} points</p>`;
    }

    function updateScoreDisplay() {
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = `Your score: ${score} points`;
        }
    }

    socket.on('leaderboard-update', updateLeaderboard);

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
}
