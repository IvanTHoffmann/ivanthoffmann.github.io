
// html elements
var html_score;
var html_debug;
var html_canvas;
var html_betTime;
var context;

// back-end variables
var windowWidth = 1;
var windowHeight = 1;
var canvasSize = 1;
var gameSize = 150;
var gameScale = 1;
var teams = []
var lastFrameTime = Date.now();

// gameplay variables
var score = 100;
var nEntities = 100;
var betTeam = 0;
var betTimer = 0;
var entities = [];

// "structs"
function team(color, agression, spread, fear){
    this.color = color;
    this.agression = agression;
    this.spread = spread;
    this.fear = fear;
    this.last_population = 0;
    this.population = 0;
}

function entity(x, y, r, team){
    this.x = x;
    this.y = y;
    this.r = r;
    this.team = team;
    this.move_x = 0;
    this.move_y = 0;
    this.speed = .007;
}

// window callbacks
window.onload = function(){
    html_score = document.getElementById("score");
    html_debug = document.getElementById("debug");
    html_canvas = document.getElementById("canvas");
    html_betTime = document.getElementById("betTime");
    context = html_canvas.getContext("2d");
    
    window.addEventListener('keydown', onkeydown);
    window.addEventListener('keyup', onkeyup);

    requestAnimationFrame(update);
    arrangeElements();

    teams.push(new team("red",      1.5, 0.1, 1.0));
    teams.push(new team("green",    1.0, 0.5, 1.0));
    teams.push(new team("blue",     1.0, 0.1, 2.0));
    
    newGame();
}

window.onresize = function(){
    arrangeElements();
}

function onkeydown(e){
    if (e.key == '1'){
        placeBet(0);
    } else if (e.key == '2'){
        placeBet(1);
    } else if (e.key == '3'){
        placeBet(2);
    }
}

function onkeyup(e){
    console.log(e);
}

function arrangeElements(){
    windowWidth = window.innerWidth * .8;
    windowHeight = window.innerHeight * .8;
    
    canvasSize = windowHeight;
    if (windowWidth < windowHeight){
        canvasSize = windowWidth;
    }
    html_canvas.width = canvasSize;
    html_canvas.height = canvasSize;
    gameScale = canvasSize/gameSize;
}

function newGame(){
    for (t of teams){
        t.population = 0;
    }
    entities = [];
    for (let i=0; i<nEntities; i++){
        let r = 1;
        let x = Math.random() * (gameSize - 2*r) + r;
        let y = Math.random() * (gameSize - 2*r) + r;
        let team = Math.floor(Math.random() * 3);
        team = i % 3;
        teams[team].population++;
        entities.push(new entity(x, y, r, team));
    }
    setScore(100);
    placeBet(0);
}

function getRelation(a, b){
    // returns
    // 0 if a==b
    // 1 if a kills b
    // -1 if b kills a
    if (a == b){
        return 0;
    }
    return -((((a - b + 5) % 5) % 2) * 2 - 1);
}

function alertEntity(ent, relation, nx, ny) {
    if (relation == 1){
        // found a target
        ent.move_x += nx * teams[ent.team].agression;
        ent.move_y += ny * teams[ent.team].agression;
    }
    else if (relation == 0){
        // found a team mate
        ent.move_x -= nx * teams[ent.team].spread;
        ent.move_y -= ny * teams[ent.team].spread;
    }
    else if (relation == -1){
        // found a threat
        ent.move_x -= nx * teams[ent.team].fear;
        ent.move_y -= ny * teams[ent.team].fear;
    }
}

function clamp(x, min, max){
    if (x < min){
        return min;
    }
    if (x > max){
        return max;
    }
    return x;
}

function updateEntities(dt) {
    // loop over all entities
    for (let aID = 0; aID < entities.length; aID++){
        let a = entities[aID];
        // loop over all entities after a
        for (let bID=aID+1; bID < entities.length; bID++){
            let b = entities[bID];

            let relation = getRelation(a.team, b.team);
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            
            let sqr_dist = dx * dx + dy * dy;
            
            if (sqr_dist < (a.r + b.r) ** 2) {
                if (sqr_dist == 0) {
                    dx = 1;
                    dy = 0;
                    sqr_dist = 1;
                }
                if (relation == 1) {
                    // capture b
                    teams[a.team].population++;
                    teams[b.team].population--;
                    b.team = a.team;
                }
                else if (relation == -1) {
                    // capture a
                    teams[a.team].population--;
                    teams[b.team].population++;
                    a.team = b.team;
                }
            }
            let fourth_dist = Math.sqrt(sqr_dist) * sqr_dist;
            let nx = dx / fourth_dist;
            let ny = dy / fourth_dist;

            alertEntity(a, relation, nx, ny);
            alertEntity(b, -relation, -nx, -ny);
        }

        /* avoid walls #1
        let wall_weight = 10;
        a.move_x += wall_weight/Math.pow(a.x, 3);
        a.move_x -= wall_weight/Math.pow(gameSize-a.x, 3);
        a.move_y += wall_weight/Math.pow(a.y, 3);
        a.move_y -= wall_weight/Math.pow(gameSize-a.y, 3);
        //*/

        //* avoid walls #2
        let wall_weight = .0000015;
        a.move_x += wall_weight * gameSize*(gameSize - 2*a.x);
        a.move_y += wall_weight * gameSize*(gameSize - 2*a.y);
        //*/

        let mx = a.move_x;
        let my = a.move_y;

        a.move_x = 0;
        a.move_y = 0;

        let sqr_move_mag = mx*mx + my*my
        if (sqr_move_mag == 0){
            return;
        }
        
        let move_coeff = a.speed * dt / Math.sqrt(sqr_move_mag);
        a.x += mx * move_coeff;
        a.y += my * move_coeff;
        a.x = clamp(a.x, a.r, gameSize-a.r);
        a.y = clamp(a.y, a.r, gameSize-a.r);
    }
}

function drawRect(x, y, r, color){
    context.beginPath();
    context.fillStyle = color;
    context.arc(x*gameScale, y*gameScale, r*gameScale, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = "black";
    context.stroke();
    //context.fillRect((x-r)*gameScale, (y-r)*gameScale, (r*2)*gameScale, (r*2)*gameScale);
}

function drawEntities(){
    for (ent of entities){
        //drawRect(ent.x, ent.y, ent.r, "black");
        drawRect(ent.x, ent.y, ent.r, teams[ent.team].color);
    }
}

function update(){
    requestAnimationFrame(update);
    var now = Date.now();
    var dt = Math.max(now - lastFrameTime, 20);
    lastFrameTime = now;

    for (t of teams){
        t.last_population = t.population;
    }

    updateEntities(dt);

    betTimer += dt;
    let betMultiplier = Math.floor(betTimer / 10000) + 1;
    

    if (teams[betTeam].last_population){
        let popChange = teams[betTeam].population / teams[betTeam].last_population;
        setScore(score * popChange);
        //setScore(score * (1 - (1 - popChange) * betMultiplier));
    }
    
    //html_betTime.textContent = "Bet Multiplier: " + betMultiplier;

    context.clearRect(0, 0, canvasSize, canvasSize);
    drawEntities();
}

function setScore(inScore){
    score = Math.floor(inScore);
    html_score.textContent = "Score: " + score;
}

function placeBet(inBet){
    betTeam = inBet;
    betTimer = 0;
    html_score.style = "color: " + teams[betTeam].color;
}

function log(msg){
    let html_msg = document.createElement("Label");
    html_msg.textContent = msg;
    html_debug.appendChild(html_msg);
}