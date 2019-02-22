var myGameArea;
var myGamePiece;
var myObstacles = [];
var myscore;

function restartGame() {
  document.getElementById("myfilter").style.display = "none";
  document.getElementById("myrestartbutton").style.display = "none";
  myGameArea.stop();
  myGameArea.clear();
  myGameArea = {};
  myGamePiece = {};
  myObstacles = [];
  myscore = {};
  document.getElementById("canvascontainer").innerHTML = "";
  startGame()
}


const authOnStart = () => {
  const loggedUserName = localStorage.getItem('username');
  let loggedUserScore = localStorage.getItem('highScore');
  loggedUserScore = loggedUserScore && (loggedUserScore != null && loggedUserScore != 'null' )? loggedUserScore : 0
  if (loggedUserName) {
    document.getElementById("login").style.display = "none"
    document.getElementById("player-greet").innerHTML = `Hello ${loggedUserName}`
    document.getElementById("player-score").innerHTML = `Highest Score1: ${loggedUserScore}`
  } else {
    document.getElementById("login").style.display = "block"
  }
}


function startGame() {
  myGameArea = new gamearea();
  myGamePiece = new component(30, 30, "red", 10, 75);
  myscore = new component("15px", "Consolas", "black", 220, 25, "text");
  // handle auth
  authOnStart()
  myGameArea.start();
}

function gamearea() {
  this.canvas = document.createElement("canvas");
  this.canvas.width = 320;
  this.canvas.height = 180;    
  document.getElementById("canvascontainer").appendChild(this.canvas);
  this.context = this.canvas.getContext("2d");
  this.pause = false;
  this.frameNo = 0;
  this.start = function() {
    this.interval = setInterval(updateGameArea, 20);
  }
  this.stop = function() {
    clearInterval(this.interval);
    this.pause = true;
  }
  this.clear = function(){
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

function component(width, height, color, x, y, type) {

  this.type = type;
  if (type == "text") {
    this.text = color;
  }
  this.score = 0;    this.width = width;
  this.height = height;
  this.speedX = 0;
  this.speedY = 0;    
  this.x = x;
  this.y = y;    
  this.update = function() {
    ctx = myGameArea.context;
    if (this.type == "text") {
      ctx.font = this.width + " " + this.height;
      ctx.fillStyle = color;
      ctx.fillText(this.text, this.x, this.y);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
  this.crashWith = function(otherobj) {
    var myleft = this.x;
    var myright = this.x + (this.width);
    var mytop = this.y;
    var mybottom = this.y + (this.height);
    var otherleft = otherobj.x;
    var otherright = otherobj.x + (otherobj.width);
    var othertop = otherobj.y;
    var otherbottom = otherobj.y + (otherobj.height);
    var crash = true;
    if ((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright)) {
      crash = false;
    }
    return crash;
  }
}

// save player game instance
const savePlayerScore = async (score) => {
  // get logged in user name
  const loggedUser = localStorage.getItem('username')
  // if no loogged in player, return
  if (!loggedUser) { return; }
  // send score to server to update
  const body = {username: loggedUser, score}
  let response = await fetch('http://localhost:3000/updateScore',  {
    method: 'POST',
    body: JSON.stringify(body), // string or object
    headers: {  
      "Content-type":
      "application/x-www-form-urlencoded; charset=UTF-8"  
    },
  })
  response = await response.json()
  if (response.highScore) {
    document.getElementById("player-score").innerHTML = `Highest Score: ${response.highScore}`
    localStorage.setItem('highScore', response.highScore)
  }
  if (response.error) {
    displayError(response.error)
  }
}


function updateGameArea() {
    var x, y, min, max, height, gap;
    for (i = 0; i < myObstacles.length; i += 1) {
        if (myGamePiece.crashWith(myObstacles[i])) {
            myGameArea.stop();
            document.getElementById("myfilter").style.display = "block";
            document.getElementById("myrestartbutton").style.display = "block";
            savePlayerScore(myscore.score)
            return;
        } 
    }
    if (myGameArea.pause == false) {
        myGameArea.clear();
        myGameArea.frameNo += 1;
        myscore.score +=1;        
        if (myGameArea.frameNo == 1 || everyinterval(150)) {
            x = myGameArea.canvas.width;
            y = myGameArea.canvas.height - 100;
            min = 20;
            max = 100;
            height = Math.floor(Math.random()*(max-min+1)+min);
            min = 50;
            max = 100;
            gap = Math.floor(Math.random()*(max-min+1)+min);
            myObstacles.push(new component(10, height, "green", x, 0));
            myObstacles.push(new component(10, x - height - gap, "green", x, height + gap));
        }
        for (i = 0; i < myObstacles.length; i += 1) {
            myObstacles[i].x += -1;
            myObstacles[i].update();
        }
        myscore.text="SCORE: " + myscore.score;        
        myscore.update();
        myGamePiece.x += myGamePiece.speedX;
        myGamePiece.y += myGamePiece.speedY;    
        myGamePiece.update();
    }
}

function everyinterval(n) {
    if ((myGameArea.frameNo / n) % 1 == 0) {return true;}
    return false;
}

function moveup(e) {
    myGamePiece.speedY = -1; 
}

function movedown() {
    myGamePiece.speedY = 1; 
}

function moveleft() {
    myGamePiece.speedX = -1; 
}

function moveright() {
    myGamePiece.speedX = 1; 
}

function clearmove(e) {
    myGamePiece.speedX = 0; 
    myGamePiece.speedY = 0; 
}

window.addEventListener("keydown", checkKeyPressed, false);
window.addEventListener("keyup", checkKeyUnpressed, false);

function checkKeyPressed(evt) {
  // left arrow
    if (evt.keyCode == "37") {
        moveleft()
    }
    //up arrow
    if (evt.keyCode == "38") {
        moveup()
    }
    // right arrow
    if (evt.keyCode == "39") {
        moveright()
    }
    // down arrow
    if (evt.keyCode == "40") {
       movedown()
    }
}

function checkKeyUnpressed(evt) {
  // on key unpressed clear move
    if (evt.keyCode == "37" || evt.keyCode == "38" ||
        evt.keyCode == "39" || evt.keyCode == "40") {
        clearmove()
    }

}

const displayError = (error) => {
  document.getElementById("error").innerHTML = error
    setTimeout(()=>{
      document.getElementById("error").innerHTML = ''
    }, 2000)
}

const onLogin = async () => {
  const username = document.getElementById("usernameL").value
  const password = document.getElementById("passwordL").value
  const body = {username, password}
  let response = await fetch('http://localhost:3000/login',  {
    method: 'POST',
    body: JSON.stringify(body), // string or object
    headers: {  
      "Content-type":
      "application/x-www-form-urlencoded; charset=UTF-8"  
    },
  })
  response = await response.json()
  if (response && response.name) {
    const score = response.highScore || 0
    document.getElementById("login").style.display = "none"
    document.getElementById("logout").style.display = "block"
     // display user
    document.getElementById("player-greet").innerHTML = `Hello ${response.name}`
    document.getElementById("player-score").innerHTML = `Highest Score: ${score}`

    localStorage.setItem('username', username)
    localStorage.setItem('highScore', score)
  }
  if (response.error) {
    displayError(response.error)
  }
}


const onSignup = async () => {
  const username = document.getElementById("usernameS").value
  const password = document.getElementById("passwordS").value
  const password2 = document.getElementById("passwordS2").value
  const body = {username, password, password2}
  let response = await fetch('http://localhost:3000/signup',  {
    method: 'POST',
    body: JSON.stringify(body), // string or object
    headers: {  
      "Content-type":
      "application/x-www-form-urlencoded; charset=UTF-8"  
    },
  })
  response = await response.json()
  if (response && response.name) {
    // display user
    document.getElementById("signup").style.display = "none"
    document.getElementById("logout").style.display = "block"
    document.getElementById("player-greet").innerHTML = `Hello ${response.name}`

    localStorage.setItem('username', username)
  }
  if (response.error) {
    displayError(response.error)
  }
}

const newUserButton = () => {
  document.getElementById("signup").style.display = "block"
  document.getElementById("login").style.display = "none"
}

const onLogout = () => {
  // empty local storage
  localStorage.clear()
  // show login
  document.getElementById("player-greet").innerHTML = ''
  document.getElementById("player-score").innerHTML = ''
  document.getElementById("login").style.display = "block"
  document.getElementById("logout").style.display = "none"
}



startGame();