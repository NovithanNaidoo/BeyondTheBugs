// // === ANIMATED CODE BACKGROUND ===
// $(document).ready(function() {
//     createCodeBackground();
//     initBugGame();
//     loadProjects();
//     initAdmin();
// });

// // Create floating code bugs in background
// function createCodeBackground() {
//     const background = $('#codeBackground');
//     const bugSymbols = ['🐛', '🐞', '🦗', '🪲'];
//     const codeSnippets = [
//         'if(bug) { fix(); }',
//         'test.run();',
//         'assert(quality);',
//         'function debug()',
//         'while(testing)',
//         '// QA Testing',
//         'verify.all();',
//         '<bug>found</bug>'
//     ];
    
//     // Add 15 floating code bugs
//     for(let i = 0; i < 15; i++) {
//         const bug = $('<div class="code-bug"></div>');
//         bug.html(bugSymbols[Math.floor(Math.random() * bugSymbols.length)]);
//         bug.css({
//             left: Math.random() * 100 + '%',
//             top: Math.random() * 100 + '%',
//             animationDelay: Math.random() * 15 + 's',
//             animationDuration: (10 + Math.random() * 10) + 's'
//         });
//         background.append(bug);
//     }
    
//     // Add floating code snippets
//     for(let i = 0; i < 10; i++) {
//         const code = $('<div class="code-bug"></div>');
//         code.text(codeSnippets[Math.floor(Math.random() * codeSnippets.length)]);
//         code.css({
//             left: Math.random() * 100 + '%',
//             top: Math.random() * 100 + '%',
//             animationDelay: Math.random() * 20 + 's',
//             fontSize: '12px',
//             fontFamily: 'Courier New, monospace'
//         });
//         background.append(code);
//     }
// }

// === BUG HUNT GAME ===
let gameActive = false;
let score = 0;
let missed = 0;
let timeLeft = 60;
let gameTimer, spawnTimer;

function initBugGame() {
    $('#startBtn').click(startGame);
    $('#resetBtn').click(function() {
        resetGame();
        startGame();
    });
}

function startGame() {
    gameActive = true;
    score = 0;
    missed = 0;
    timeLeft = 60;
    updateStats();
    
    $('#startBtn').hide();
    $('#resetBtn').hide();
    $('#gameOver').hide();
    $('#gameArea').empty();
    
    // Start countdown
    gameTimer = setInterval(function() {
        timeLeft--;
        $('#timer').text(timeLeft);
        if(timeLeft <= 0) endGame();
    }, 1000);
    
    // Spawn first bug immediately
    spawnBug();
}

function spawnBug() {
    if(!gameActive) return;

    const bugTypes = ['🐛', '🐞', '🦗', '🪲', '🪳', '🦟', '🕷️', '🐜', '🪰', '🦂'];
    
    const area = $('#gameArea');
    const maxX = area.width() - 50;
    const maxY = area.height() - 50;
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;

    const randomBug = bugTypes[Math.floor(Math.random() * bugTypes.length)];
    
    const bug = $('<div class="bug"></div>');
    bug.text(randomBug);
    bug.css({ left: x + 'px', top: y + 'px' });
    
    // Bug click handler
    bug.click(function() {
        if(!gameActive) return;
        score += 10;
        updateStats();
        createSplat(x, y);
        showScorePopup(x, y);
        $(this).remove();
        
        // Spawn next bug immediately after killing this one
        setTimeout(spawnBug, 300); // Small delay before next bug
    });
    
    area.append(bug);
    
    // Remove bug after 3 seconds if not clicked
    setTimeout(function() {
        if(bug.parent().length) {
            missed++;
            updateStats();
            bug.remove();
            // Spawn next bug after miss
            setTimeout(spawnBug, 200);
        }
    }, 2000);
}

function createSplat(x, y) {
    const splat = $('<div class="splat"></div>');
    splat.css({ left: x - 15 + 'px', top: y - 15 + 'px' });
    $('#gameArea').append(splat);
    setTimeout(() => splat.remove(), 600);
}

function showScorePopup(x, y) {
    const popup = $('<div class="score-popup">+10</div>');
    popup.css({ left: x + 'px', top: y + 'px' });
    $('#gameArea').append(popup);
    setTimeout(() => popup.remove(), 1000);
}

function updateStats() {
    $('#score').text(score);
    $('#timer').text(timeLeft);
    $('#missed').text(missed);
}

function endGame() {
    gameActive = false;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    
    $('#finalScore').text(score);
    $('#gameArea').find('.bug').remove();
    $('#gameOver').fadeIn();
    $('#resetBtn').show();
}

function resetGame() {
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    $('#gameArea').empty();
    $('#gameOver').hide();
}

// === PROJECT MANAGEMENT ===
function loadProjects() {
    if(!$('#projectsContainer').length) return;
    
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const container = $('#projectsContainer');
    container.empty();
    
    if(projects.length === 0) {
        container.html('<div class="col-12 text-center py-5"><p class="text-muted">No projects yet. Login as admin to add projects.</p></div>');
        return;
    }
    
    projects.forEach(project => {
        const card = `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    ${project.image ? `
                        <img src="${project.image}" class="card-img-top" alt="${project.title}" 
                             style="height: 200px; object-fit: cover; cursor: pointer;"
                             onclick="window.open('${project.demo || project.github}', '_blank')">
                    ` : `
                        <div class="bg-secondary text-white d-flex align-items-center justify-content-center" 
                             style="height: 200px; cursor: pointer;"
                             onclick="window.open('${project.demo || project.github}', '_blank')">
                            <i class="fas fa-code fa-3x"></i>
                        </div>
                    `}
                    <div class="card-body">
                        <h5 class="card-title">${project.title}</h5>
                        <p class="card-text">${project.description}</p>
                        <p class="small text-muted"><i class="fas fa-tools"></i> ${project.tech}</p>
                        <div class="d-flex gap-2">
                            <a href="${project.github}" target="_blank" class="btn btn-success btn-sm">
                                <i class="fab fa-github"></i> GitHub
                            </a>
                            ${project.demo ? `
                                <a href="${project.demo}" target="_blank" class="btn btn-outline-success btn-sm">
                                    <i class="fas fa-external-link-alt"></i> Demo
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });
}

// === ADMIN FUNCTIONALITY ===
function initAdmin() {
    // Login
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        const user = $('#username').val();
        const pass = $('#password').val();
        
        if(user === 'admin' && pass === 'Ch@rl123$') {
            localStorage.setItem('loggedIn', 'true');
            window.location.href = 'admin-dashboard.html';
        } else {
            $('#loginError').text('Invalid username or password').show();
        }
    });
    
    // Check admin access
    if(window.location.pathname.includes('admin-dashboard.html')) {
        if(localStorage.getItem('loggedIn') !== 'true') {
            window.location.href = 'admin-login.html';
        }
        loadAdminProjects();
    }
    
    // Add project
    $('#addProjectForm').submit(function(e) {
        e.preventDefault();
        const project = {
            id: Date.now(),
            title: $('#title').val(),
            description: $('#description').val(),
            github: $('#github').val(),
            tech: $('#tech').val(),
            demo: $('#demo').val()
        };
        
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        projects.push(project);
        localStorage.setItem('projects', JSON.stringify(projects));
        
        alert('Project added successfully!');
        this.reset();
        loadAdminProjects();
    });
}

function loadAdminProjects() {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const container = $('#projectsList');
    container.empty();
    
    if(projects.length === 0) {
        container.html('<p class="text-muted">No projects yet.</p>');
        return;
    }
    
    projects.forEach(project => {
        const item = `
            <div class="card mb-2">
                <div class="card-body">
                    <h6>${project.title}</h6>
                    <p class="small mb-2">${project.description}</p>
                    <button class="btn btn-sm btn-danger" onclick="deleteProject(${project.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        container.append(item);
    });
}

function deleteProject(id) {
    if(!confirm('Delete this project?')) return;
    
    let projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects = projects.filter(p => p.id !== id);
    localStorage.setItem('projects', JSON.stringify(projects));
    loadAdminProjects();
}

function logout() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'admin-login.html';
}

// Contact form
$('#contactForm').submit(function(e) {
    e.preventDefault();
    $('#formMessage').removeClass('alert-danger').addClass('alert-success')
        .text('Message sent! I\'ll get back to you soon.').show();
    this.reset();
    setTimeout(() => $('#formMessage').fadeOut(), 3000);
});

