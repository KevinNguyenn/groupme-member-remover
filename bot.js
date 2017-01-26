
var HTTPS = require('https');
var cool = require('cool-ascii-faces');

// INSERT TOKEN HERE
var userToken = '5TLh7xi39LdkO2uEqk1UER6YsgMpReJkwDrByqIr';

// This bot id will be pre-determined based on the group that is selected from the GroupMe bot form.
var botID = process.env.BOT_ID;
// var botID = "27859026beede2528022f084d4";
var groupId = process.env.GROUP_ID;

var warningUsers = [];
var trollUsers = [];

function scanMessagesForRejoin() {
    console.log("scan messages for rejoin");
    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + groupId + '/messages?limit=5&token=' + userToken, 
        method: 'GET'
    }

    var output = '';

    var messages = {};
    var req = HTTPS.request(options, function(res) {
        // The get messages status code is 200 for GET
        if(res.statusCode == 200) {
            console.log("fetching messages...");
            res.on('data', function(chunk) {
                output += chunk
            });
            res.on('end', function() {
                var obj = JSON.parse(output);
                messages = obj.response.messages;
                console.log(messages);
                // Parse messages to see if theres a troll in the group
                for(var i = 0; i < messages.length - 1; i++) {
                    if(messages[i].event && messages[i+1].event) {
                        if(messages[i].event.type == "membership.announce.rejoined" && messages[i+1].event.type == "membership.notifications.exited") {
                            if(messages[i].event.data.user.id == messages[i].event.data.removed_user.id) {
                                var potentialTrollUser = _.filter(warningUsers, {'id': messages[i].event.data.user.id});
                                if(potentialTrollUser == null) {
                                    warningUsers.push(messages[i].event.data.user);
                                }
                                else {
                                    removeUser(potentialTrollUser[0]);
                                }
                            }
                        }
                    }
                }
            });
        }else {
          console.log("something bad happened while fetching... " + res);
        }
    });

    req.on('error', function(err) {
      console.log('error fetching... '  + JSON.stringify(err));
    });

    req.end();
}

function removeUser(trollUser) {
    var botReq;
    console.log("this is trollUser " + trollUser);
    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + groupId + '/members/' + trollUser.id + '/remove',
        method: 'POST'
    }

    botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
    });

    var botResponse = "eliminated. Life will be better without their EXTRA presence. " + cool();

    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

      body = {
        "bot_id" : botID,
        "text" : botResponse
      };

      console.log('sending ' + botResponse + ' to ' + botID);

      botReq = HTTPS.request(options, function(res) {
          if(res.statusCode == 202) {
            //neat
          } else {
            console.log('rejecting bad status code ' + res.statusCode);
          }
      });

      botReq.on('error', function(err) {
        console.log('error posting message '  + JSON.stringify(err));
      });
      botReq.on('timeout', function(err) {
        console.log('timeout posting message '  + JSON.stringify(err));
      });
      botReq.end(JSON.stringify(body));
}



// Main function
function respond() {
    console.log("enter here");
    var intervalObject = {};
    var request = JSON.parse(this.req.chunks[0]),
    botRegex = /^\/ready to wipe trolls/,
    botStopRegex = /^\/stop punishing trolls/;

    // this.res.writeHead(200);
    //     postMessage();
    //     this.res.end();
    //     // This interval is critical to keep checking the messages
    //     // intervalObject = setInterval(function() {
    //         scanMessagesForRejoin();
    //     // }, 1000);

    if(request.text && botRegex.test(request.text)) {
        this.res.writeHead(200);
        postMessage("Let's wipeout these wild people. ");
        this.res.end();
        //This interval is critical to keep checking the messages
        intervalObject = setInterval(function() {
            scanMessagesForRejoin();
        }, 1000);
    } 
    else if(request.text && botStopRegex.test(request.text)) {
        this.res.writeHead(200);
        postMessage("I hope these wild people are out of your group chat. Have a nice day! ");
        clearInterval(intervalObject);
    }
    else {
        console.log("don't care");
        this.res.writeHead(200);
        this.res.end();
    }
}


function postMessage(msg) {
  var botResponse, options, body, botReq;

  // botResponse = cool();
  botResponse = msg + cool(); 

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id" : botID,
    "text" : botResponse
  };

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
      // The bot statusCode is 202 for POST
      if(res.statusCode == 202) {
        console.log("successfull initiating wipeout.");
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}


exports.respond = respond;
