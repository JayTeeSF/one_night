var gameIdInput, gameRecordId, instructionsAndButtonsElement, numPlayersSpan, gameIdDisplay, playerRecordId, nameInput;
var gameId, numPlayers, name, db, roleObjs, gPlayerId, isHost;
var gInitialCardDisplayed = false;
const assignedRoleObjs = [];
const dbApiCorsKey = "5f0536bca529a1752c476e9a";
const baseTableUrl = "https://onenight-35b3.restdb.io/rest";
const windowQs = window.location.search;
const urlParams = new URLSearchParams(windowQs);

function setupVars() {
  console.log(`setupVars()...`);
  instructionsAndKickoffScreen = document.getElementById("instructionsAndKickoffScreen");
  createGameScreen = document.getElementById("createGameScreen");
  joinGameScreen = document.getElementById("joinGameScreen");
  displayCardScreen = document.getElementById("displayCardScreen");
  countdownDisplay = document.getElementById("countdown");
  gameScreen = document.getElementById("gameScreen");
  gameIdDisplay = document.getElementById("gameIdDisplay");
  gameIdInput = document.getElementById("gameIdInput");
  numPlayersInput = document.getElementById("numPlayersInput");
}

function currentTimestamp() {
  return Math.round(Date.now() / 1000);
}

function generateGame(startedAt = currentTimestamp()) {
  return {
    "numPlayers": numPlayers,
    "startedAt": startedAt,
  };
}

function generatePlayer(idOfGame, name=null) {
  name ||= nameInput.value;
  return {
    "gameId": idOfGame,
    "name": name,
    "isHost": isHost,
  };
}

function select(tableName, filter, callback, badcallback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status >= 200 && this.status < 300) {
        if (callback) {
          callback(this.responseText);
        }
      } else {
        if (badcallback) {
          badcallback(this);
        }
      }
    }
  };

  var stringifiedFilter = JSON.stringify(filter);
  xhttp.open("GET", `${baseTableUrl}/${tableName}?q=${stringifiedFilter}`, true);
  xhttp.setRequestHeader("Content-Type", "application/json");
  xhttp.setRequestHeader("x-apikey", dbApiCorsKey);
  console.log(`Selecting '${tableName}' Record where: ${stringifiedFilter}...`);
  send(xhttp, null);
}

function send(xhttp, argsAry=null, delay=300) {
  setTimeout(function () {
    if (argsAry) {
      xhttp.send(...argsAry);
    } else {
      xhttp.send()
    }
  }, delay);
}

/*
 * curl -i -H "Accept: application/json" -H "Content-Type: application/json" -H "x-apikey: ${API_KEY}" -X POST "https://onenight-35b3.restdb.io/rest/games" -d "{\"numPlayers\": 4, \"startedAt\": ${timestamp}}"
 * HTTP/1.1 201 Created
 * {"_id":"5f054d23498ad768000701ae","numPlayers":4,"startedAt":1594182936,"id":1004,"_created":"2020-07-08T04:35:47.785Z","_changed":"2020-07-08T04:35:47.785Z","_createdby":"api","_changedby":"api","_keywords":["api","1594182936","1004"],"_tags":"api 1594182936 1004","_version":0}
 */
function insert(tableName, data, callback, badcallback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status >= 200 && this.status < 300) {
        if (callback) {
          callback(this.responseText);
        }
      } else {
        if (badcallback) {
          badcallback(this);
        }
      }
    }
  };

  xhttp.open("POST", `${baseTableUrl}/${tableName}`, true);
  xhttp.setRequestHeader("Content-Type", "application/json");
  xhttp.setRequestHeader("x-apikey", dbApiCorsKey);
  var stringifiedData = JSON.stringify(data);
  console.log(`Generating New '${tableName}' Record: ${stringifiedData}...`);
  // xhttp.send(stringifiedData);
  send(xhttp, [stringifiedData]);
}

/*
 * need the _id of the row we're updating...
 *
 * export ROW_ID="5f079e1e498ad76800076903"
 * export API_KEY="..."
 * curl -i -H "Accept: application/json" -H "Content-Type: application/json" -H "x-apikey: ${API_KEY}" -X PATCH "https://onenight-35b3.restdb.io/rest/players/${ROW_ID}" -d "{\"roleKey\": \"Revealer\"}"
 */
function update(tableName, rowId, data, callback, badcallback) {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status >= 200 && this.status < 300) {
        if (callback) {
          callback(this.responseText);
        }
      } else {
        if (badcallback) {
          badcallback(this);
        }
      }
    }
  };

  xhttp.open("PUT", `${baseTableUrl}/${tableName}/${rowId}`, true);
  xhttp.setRequestHeader("Content-Type", "application/json");
  xhttp.setRequestHeader("x-apikey", dbApiCorsKey);
  var stringifiedData = JSON.stringify(data);
  console.log(`Updating '${tableName}' Record(${rowId}) with ${stringifiedData}...`);
  // xhttp.send(stringifiedData);
  send(xhttp, [stringifiedData]);
}

function handleGameInsert(res) {
  console.log(`handleGameInsert(res): adds game info link to screen then calls setupRoles`);
  
  var gameRecord = JSON.parse(res);
  gameRecordId = gameRecord["_id"];
  gameId = Number(gameRecord.id);
  console.log(`handleGameInsert(<gameReecordJSON>): GRID${gameRecordId}::::GID:${gameId}`);
  var linkOfGameId = gameId.toString().link(`${window.location}?gameId=${gameId}`)
  gameIdDisplay.innerHTML = linkOfGameId;

  //console.log(`-> AFTER response: ${res}; "id" (not _id): ${gameId}; tbd: add player to players table...`);
  console.log(`new Game: ${gameId}; get all roles, then assign the dealer's role...`);
  select("roles", {
    "assignable": true
  }, setupRoles);
}

// thx to: https://javascript.info/task/shuffle
// modifies input array!
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // we use "destructuring assignment" syntax to achieve that
    // you'll find more details about that syntax in later chapters
    // same can be written as:
    // let t = array[i]; array[i] = array[j]; array[j] = t
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function _reCacheRandomRoles(res, cb) {
  console.log(`_reCacheRandomRoles(${res}, cb <-- setup nonHost player)...`);

  var gameRecords = JSON.parse(res);
  console.log(`_reCacheRandomRoles: gameRecords: ${JSON.stringify(gameRecords)}`)
  var gameRecord = gameRecords[0];
  console.log(`_reCacheRandomRoles: gameRecord: ${gameRecord}`)
  gameRecordId = gameRecord["_id"];
  roleObjs = gameRecord["randomRoles"];
  var role = roleObjs.shift();
  assignedRoleObjs.push({
    [name]: role
  });
  // fill rest of assignedRoleObjs by doing a select of the players table, where gameId = gameId and name & roleKey are not null
  if (cb) {
    console.log(`_reCacheRandomRoles(): (which extracted gameRecordId: ${gameRecordId}) is calling callback (to setup nonHost player) after assigning global roleObjs and assignedRolesObjs vars`);
    cb();
  } else {
    console.log(`_reCacheRandomRoles(): NO Callback found!!!`);
  }
}

// only run this if you know what you're doing
function _fetchRandomRoles(cb) {
  console.log(`_fetchRandomRoles(cb <-- this setups up nonHost player): selecting the current game using (numeric) gameId: ${gameId}...`);
  select("games", {
     "id": gameId
  }, (res) => {
    console.log(`_fetchRandomRoles selected game is being passed to _reCacheRandomRoles(res, cb <-- this setups up the nonHost player)...`);
    _reCacheRandomRoles(res, cb)
  });
  // "gameId": gameId
  //select("games", gameRecordId, {randomRoles: roleObjs}); // set it and forget it
}

function setupRoles(res) {
  console.log(`setupRoles(res): will insert the host player and deal that player a role.`);

  var values = JSON.parse(res);
  shuffle(values); // roles.random
  const roles = values.slice(0, numPlayers); // limit(numPlayers)
  const keys = roles.map((obj, i) => ("roleKey"));
  roleObjs = keys.map((obj, i) => ({
    [obj]: roles[i]["key"]
  }));
  update("games", gameRecordId, {
    randomRoles: roleObjs
  }); // set it and forget it

  insert("players", generatePlayer(gameId, name), savePlayerIdAndDealRole(name));

  /*
    // EACH computer should know the "playerId"
    // the dealer will assign all roles to each player (w/o seeing what they are)
    // make a separate functino to assign a role...
    // tbd: lookup these if the game already exists...
    var role = roleObjs.shift();

    assignedRoleObjs.push({
        [name]: role
    });

  // console.log(`saved random roleObjs: ${JSON.stringify(roleObjs)} from res (${res}). Inserting current player (/dealer) with the first random role: ${role}...`);
    console.log(`saved random roleObjs: ${JSON.stringify(roleObjs)}. Inserting current player (/dealer) with the first random role: ${JSON.stringify(role)}...`);

    insert("players", { ...role,
        ...generatePlayer(gameId)
    }, savePlayerId); //logQueryResult);
    */
}

function savePlayerIdAndDealRole(playerName=name) {
  console.log(`savePlayerIdAndDealRole(${playerName})...`);

  var cb = (thePlayer) => { 
    console.log(`in cb* of savePlayerId, as called from savePlayerIdAndDealRole for player: ${playerName}. *Note: cb is dealRoleTo(playerName, thePlayer(obj))...`)
    dealRoleTo(playerName, thePlayer);
  };
  console.log(`dealRoleTo bruv: ${playerName}`)

  return (res) => {
    console.log(`callback that's about to trigger savePlayerId(${res}, cb(aka dealRoleTo(playerName...))...`)
    savePlayerId(res, cb);
  }
}

function logQueryResult(res) {
  console.log(` --> [logQueryResult]: res: ${res}...`);
}

function savePlayerId(res, cb) {
  console.log(`savePlayerId(res, cb)...`);
  
  var player = JSON.parse(res);
  gPlayerId = Number(player._id);
  console.log(` --> [saving Player Id]: player: ${res}...`);
  if(cb) { 
    console.log(`savePlayerId called w/ cb(<record for ${player['name']}>)...`);
    cb(player);
  }
}

/*
function displayMyRole(roleKey) {
}
*/

function cardNameToFileName(cardName) {
  console.log(`cardNameToFileName(${cardName})...`);
  if (cardName.includes(" ")) {
    var cardWords = cardName.split(" ")
    var retVal = `/one_night/assets/images/${cardWords[0].toLowerCase()}${cardWords[1]}.jpg`;
    console.log(retVal);
    return retVal;
  } else {
    var retVal = `/one_night/assets/images//${cardName.toLowerCase()}.jpg`;
    
    console.log(retVal);
    return retVal;
  }
}

function displayRole(roleKey) {
  console.log(`displayRole(${roleKey})...`);
  if (! gInitialCardDisplayed) {
    select("Roles", {"key": roleKey}, (res) => {
      if (res.length === 0) {
      } else {
        console.log(`role for roleKey(${roleKey}): ${res}`)
        var objs = JSON.parse(res);
        var obj = objs[0];
        var imageId = obj["front"][0];
        console.log(`https://onenight-35b3.restdb.io/media/${imageId}?s=w`)
        //var img = document.createElement("img");
        //img.src = `https://onenight-35b3.restdb.io/media/${imageId}?s=w`;
        //var src = document.getElementById("initialCard");
        //src.appendChild(img);
        gInitialCardDisplayed = true;
      }
    }
    )
  }
}

/*
 var role = roleObjs.shift();
  

 assignedRoleObjs.push({
   [name]: role
 });

 console.log(`saved random roleObjs: ${JSON.stringify(roleObjs)}. Inserting current player (/dealer) with the first random role: ${JSON.stringify(role)}...`);

 insert("players", { ...role,
   ...generatePlayer(gameId)
 }, savePlayerId); //logQueryResult);
 */
function dealRoleTo(somePlayerName, selectedPlayerRecord) {
  console.log(`dealRoleTo(${somePlayerName}, ${selectedPlayerRecord})...`);
  if (typeof selectedPlayerRecord == "undefined") {
  console.log(`randomly assign a role to player named: ${somePlayerName}, after selecing from the 'players' table where the rolKey is unassigned...`);
  select("players", {
    "gameId": gameId,
    "name": somePlayerName,
    "roleKey": {"$exists": false}
  }, appendRoleToFirstPlayer
  );
  } else {
  console.log(`randomly assign a role to player named: ${somePlayerName}, using the ALREADY selected object`);
    // appendRoleToFirstPlayer(selectedPlayerObject);
    appendRoleToPlayer([selectedPlayerRecord], 1, 0);
  }
}

function playerHasARole(roleObjAssignment, playerName) {
  console.log(`playerHasARole(${roleObjAssignment}, ${playerName})...`);
  if (typeof (roleObjAssignment[playerName]) == 'undefined' || roleObjAssignment[playerName] == null) {
    return false;
  } else {
    return true;
  }
}

function roleAssignedTo(playerName) {
  console.log(`roleAssignedTo(${playerName})...`);
  return assignedRoleObjs.some((obj) => {
    return playerHasARole(obj, playerName)
  }); // not sure the retun here is needed
}

function removeRoleAssignmentFor(playerName) {
  console.log(`removeRoleAssignmentFor(${playerName})...`);
  var idx = assignedRoleObjs.findIndex((obj) => {
    return playerHasARole(obj, playerName)
  }); // SURE the retun here IS needed
  if (idx > -1) {
    roleObjs.unshift(assignedRoleObjs[idx][playerName]);
    assignedRoleObjs.splice(idx, 1);
    console.log(`Removed assigned role for player '${playerName}'.`);
  } else {
    console.error(`*** Failed to remove assigned role for player '${playerName}' ***`);
  }
}

function appendRoleToPlayers(res, cbBuilder=null) {
  console.log(`appendRoleToPlayers(res, cbBuilder)...`);
  var playerRecords = JSON.parse(res);
  console.log(`playerRecords: ${playerRecords}`);
  appendRoleToPlayer(playerRecords, playerRecords.length, 0, cbBuilder)
}

function appendRoleToFirstPlayer(res) {
  console.log(`appendRoleToFirstPlayer(${res})...`);
  var playerRecords = JSON.parse(res);
  var playerRecord = playerRecords[0];
  playerRecordId = playerRecord['_id'];
  appendRoleToPlayer([playerRecord], 1, 0);
}

function appendRoleToPlayer(playerRecords, ct, idx, cbBuilder=null) {
  console.log(`appendRoleToPlayer(playerRecords, ct, idx, cbBuilder)...`);
  var playerRecord = playerRecords[idx];
  console.log(`appendRoleToPlayer: playerRecords[${idx}]: ${playerRecord}`);
  var playerName = playerRecord["name"];
  var cb;

  if (roleAssignedTo(playerName)) {
    console.error(`appendRoleToPlayer: Player '${playerName}' already has an assigned role.`);
  } else {
    console.log(`appendRoleToPlayer: unassignedRoles: ${JSON.stringify(roleObjs)}, assignedRoles: ${JSON.stringify(assignedRoleObjs)}`);
    var roleObj = roleObjs.shift();
    assignedRoleObjs.push({
      [playerName]: roleObj
    });
    var defaultCallback = getRoleDisplayer(roleObj);
    console.log(`appendRoleToPlayer: Got player row (${JSON.stringify(playerRecord)}), now assigning random role: ${JSON.stringify(roleObj)}...`);
    // a single-line-if goes ahead of the command, in Javascript: if(true) console.log("got true");
    if (cbBuilder) { cb = cbBuilder(playerRecords, ct, idx); };
    var callbackChain = (res) => {
      defaultCallback(res);
      if(cb) { 
        console.log(`appendRoleToPlayer: after defaultCallback (getRoleDisplayer), calling cb(${JSON.stringify(res)})`)
        cb(res); 
      };
    };

    console.log(`****appendRoleToPlayer's about to update the player table w/ pR[id]: ${playerRecord["_id"]} ****`);
    update("players",
      playerRecord["_id"],
      {
        name: playerName,
        gameId: gameId,
        ...roleObj
      },
      callbackChain,
      (res) => {
        console.log("**** In Callback for appendRoleToPlayer's call to update the player table... ****");
        removeRoleAssignmentFor(playerName)
      }
    );
  }
}

function getRoleDisplayer(roleObj) {
  console.log(`getRoleDisplayer(roleObj)...`);
  var role = roleObj["roleKey"]
  console.log("about to add role and image");
  document.getElementById("cardName").innerHTML = role;
  var cardImage = document.getElementById("cardImage");
  cardImage.src=cardNameToFileName(role);
  cardImage.width = 187.5;
  console.log("supposedly added role and image");
  console.log(`preparing callback with displayRole using role: ${role}`);
  return (res) => {
    console.log(`running callback around displayRole with role: ${role}`)
    displayRole(role);
  };
}

function changePlayerCountDisplay(playerCount){
  console.log(`changePlayerCountDisplay(${playerCount})...`);
  document.getElementById("playersIn").innerHTML = `${playerCount} Players`
  console.log(playerCount, typeof playerCount)
}

function seenCard() {
  console.log(`seenCard()...`);
  var pR, gPI, gRI;
  if (typeof playerRecord == 'undefined') {
    pR = -1;
  } else {
    pR = playerRecord;
  }
  if (typeof gPlayerId == 'undefined') {
    gPI = -1;
  } else {
    gPI = gPlayerId;
  }
  if (typeof gameRecordId == 'undefined') {
    gRI = -1;
  } else {
  gRI = gameRecordId;
  }
 console.log(`****seenCard(): about to update the player table w/ pRId: ${playerRecordId} & gId: ${gameId} // pR[id]: ${pR["_id"]}, gPlayerId: ${gPI}, gameRecordId: ${gRI} ****`);
 
  update("players",
        playerRecordId,
        {
          "seenCard": true
        }, (res) => {
          console.log(`seenCard(): callback w/ ${JSON.stringify(res)}`)
        }, (res) => {
          console.log(`seenCard(): badcallback w/ ${JSON.stringify(res)}`)
        }
  );
  
  checkGameStart();
}

function timeout() {
  const myTimeout = setTimeout(checkGameStart, 1000);
}

function countdownTimeout(num) {
  num++;
  const newTime = setTimeout(countdown, 1000, num);
  console.log(`Timeout ${num}`);
}

function countdown(num) {
  console.log(`countdown(${num})...`);
  if (num == 0) {
    remove(displayCardScreen);
    display(countdownPage);
    countdownTimeout(num);
  } else if (num == 1) {
    countdownDisplay.src="https://cdn.pixabay.com/photo/2015/04/04/19/13/two-706896_1280.jpg";
    countdownTimeout(num);
  } else if (num == 2) {
    countdownDisplay.src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQKD8DPG5uQWsufJsaob4TEiq3UPi-SqJKPw&usqp=CAU";
    countdownTimeout(num);
  } else {
    remove(countdownPage);
    display(gameScreen);
  }
}

function checkGameStart() {
  console.log(`checkGameStart()...`);
  select(
    "players",
    {
      "gameId": gameId,
      "seenCard": true
    },
    (res) => {
      if (JSON.parse(res) == 0) {
        console.log(`res IS EMPTY: ${res}`);
        console.log("Database doesn't say we have seen card");
        countdown(0);
      } else if (JSON.parse(res).length == numPlayers) {
        countdown(0);
      } else {
        console.log(`res IS FULL: ${res}`);
        console.log(`Only ${JSON.parse(res).length} players seen card`);
        timeout();
      }
    }
  );
}

function countPlayers() {
  console.log(`countPlayers()...`);
  select(
    "players",
    {
      "gameId": gameId
    }, 
    (res) => {
      if (JSON.parse(res) == 0) {
        console.log(`res IS EMPTY: ${res}`);
        changePlayerCountDisplay(0);
      } else {
        console.log(`res IS FULL: ${res}`);
        changePlayerCountDisplay(JSON.parse(res).length);
      }
    }
  );
}
  
function addRolesToPlayers() {
  console.log(`addRolesToPlayers()...`);
  select(
    "players",
    {
      "gameId": gameId,
      "name": {"$exists": true},
      "roleKey": {"$exists": false}
    },
    (res) => {
      if (res.length === 0) {
        console.log(`res IS EMPTY: ${res}`);
        sleepThenAddRolesToPlayers()
      } else {
        console.log(`res IS FULL: ${res}`);
        appendRoleToPlayers(res, appendRoleToNextPlayer)
      }
    }
  ); //appendRoleToNextPlayer creates the loop...
}

function startGame(doCreate = false) {
  console.log(`startGame(${doCreate ? 'create' : 'join'}): called show cards`);
  showCards();
  name = nameInput.value;
  gameId = Number(gameIdInput.value);

  if (doCreate) {
    isHost = true;
    numPlayers = Number(numPlayersInput.value);
    console.log(`startGame(true): with ${numPlayers} players, as name: ${name} -- No-gameId: >>${gameId}<< (yet)...`);
    insert("games", generateGame(), handleGameInsert);
  } else {
    isHost = false;
    numPlayers = null;
    console.log(`startGame(doCreate=false) (AKA: JoinGame): (gameId: ${gameId}) as name: ${name} -- No-numPlayers: >>${numPlayers}<< (yet)...`);
    let generatedPlayerObject = generatePlayer(gameId, name);
    insert("players",
           generatedPlayerObject,
           (ignoreeRes1) => { 
             console.log(`don't trigger _fetchRandomRoles immediately, wrap it in an anonymous fn, so we can call it with pre-defined values`);
             _fetchRandomRoles(
               (ignoredRes2) => {
                 let savePlayerIdCallback = savePlayerIdAndDealRole(name);
                 let gPORes = JSON.stringify(generatedPlayerObject);
                 console.log(`even though savePlayerIdAndDealRole(name) immediately returns, it supplies a callback ..that needs to be called w/ the generatedPlayerObject: ${gPORes}`);
                   savePlayerIdCallback(gPORes);
               }
             )
           }
    );

  }
}

function createGame() {
  console.log(`createGame()...`);
  setupVars();
  nameInput ||= document.getElementById("createNameInput");

  remove(instructionsAndKickoffScreen);
  display(createGameScreen);
}

function showCards() {
  console.log("showCards()...")
  // setupVars(); // should be redundant because createGame & joinGame (the two main entry points) will have already called setupVar()...
  try {
    remove(createGameScreen);
  } catch(e) {
    console.log(e)
  }
  try {
    remove(joinGameScreen);
  } catch(e) {
    console.log(e)
  }
  display(displayCardScreen);
}

// https://www.sitepoint.com/get-url-parameters-with-javascript/
function joinGame(urlGameId) {
  console.log(`joinGame(${urlGameId})...`);
  setupVars();
  if (typeof (urlGameId) != 'undefined' && urlGameId != null) {
    gameIdInput.value = urlGameId; // ok if it's still a string
  }
  nameInput ||= document.getElementById("joinNameInput");

  remove(instructionsAndKickoffScreen);
  display(joinGameScreen);
}

function show(el) {
  el.style.visibility = 'visible';
}

function hide(el) {
  el.style.visibility = 'hidden';
}

function display(el) {
  el.style.display = 'inline';
}

function remove(el) {
  el.style.display = 'none';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepThenAddRolesToPlayers() {
  logQueryResult("----> SLEEP before trying to sleepThenAddRolesToPlayers()...");
  await sleep(3000);
  logQueryResult(" ....NOW, trying to sleepThenAddRolesToPlayers()...");
  addRolesToPlayers();
}

// FIXME: change loop to compare # of roles in the game w/ number of rows in player table for this gameId, that HAVE a name & role defined...
function appendRoleToNextPlayer(playerRecords, ct, idx) {
  console.log(`appendRoleToNextPlayer(playerRecords, ct, idx)...`);
  if ((ct > 0) && ((idx + 1) <= ct) && (playerRecords[idx + 1])) {
    return (res) => {
      console.log(`** appendingRoleToPlayer #${idx + 1}/${ct}: ${JSON.stringify(playerRecords[idx + 1])} **`);
      appendRoleToPlayer(playerRecords, ct, idx + 1, sleepThenAddRolesToPlayers); // re-query
    };
  } else {
    // check if we're ready to start the game or re-query...
    if (roleObjs.length > 0) {
      console.log(`*** (${roleObjs.length}) More Roles to assign; last player so far was: #${idx}/${ct} ***`);
      //addRolesToPlayers();
      sleepThenAddRolesToPlayers();
    } else {
      console.log(`***** Ready to start game, reached player #${idx}/${ct} *****`);
    }
    return null;
  }
}

var urlGameId = urlParams.get('gameId');
console.log(` ===== START OF CODE, after grabbing gameId (${urlGameId}) from urlParams ===== `);
if (typeof (urlGameId) != 'undefined' && urlGameId != null) {
  console.log("automatically advancing to Join Game Screen (to get the player's Name before calling StartGame)...");
  joinGame(urlGameId);
}
