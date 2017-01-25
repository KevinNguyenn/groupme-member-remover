var HTTPS = require('https');
var cool = require('cool-ascii-faces');
var _ = require('lodash');

// INSERT TOKEN HERE
var userToken = '';

// This bot id will be pre-determined based on the group that is selected from the GroupMe bot form.
var botID = process.env.BOT_ID;
var groupId = 0;

var warningUsers = [];
var trollUsers = [];

function scanMessagesForRejoin() {
    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + groupId + '/messages?limit=10&token=' + userToken 
        method: 'GET'
    }

    var output = '';

    var messages = {};

    var req = HTTPS.request(options, function(res) {
        if(res.statusCode == 202) {
            res.on('data', function(chunk) {
                output += chunk
            });
            res.on('end', function() {
                var obj = JSON.parse(output);
                messages = obj.response.messages;

                // Parse messages to see if theres a troll in the group
                for(var i = 0; i < messages.length - 1; i++) {
                    if(messages[i].event && messages[i+1].event) {
                        if(messages[i].event.type == "membership.announce.rejoined" && messages[i+1].event.type == "membership.notifications.exited") {
                            if(messages[i].event.data.user.id == messages[i].event.data.removed_user.id) {
                                var potentialTrollUser = _.filter(warningUsers, {'id': messages[i].event.data.user.id});
                                if(potentialTrollUser == null) {
                                    warningUsers.push(potentialTrollUser[0]);
                                }
                                else {
                                    removeUser(potentialTrollUser);
                                }
                            }
                        }
                    }
                }
            });
        }
    });

    req.end();
}

function getGroupIdFromBotId() {
    var options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots',
        method: 'GET'
    }

    var output = '';

    var req = HTTPS.request(options, function(res) {
        if(res.statusCode == 202) {
            res.on('data', function(chunk) {
                output += chunk;
            });
            res.on('end', function() {
                var obj = JSON.parse(output);

                for(var i = 0; i < obj.length; i++) {
                    if(obj[i].bot_id == botID) {
                        groupId = obj[i].group_id;
                    }
                }
            })
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
        }
    });

    req.on('error', function(err) {
        console.log("error fetching")
    })

    req.end();
}


function removeUser(trollUser) {
    // FILL HERE
}



// Main function
function respond() {
    getGroupIdFromBotId();
    scanMessagesForRejoin();
    var request = JSON.parse(this.req.chunks[0]),
    botRegex = /^\/cool guy$/;

    if(request.text && botRegex.test(request.text)) {
        this.res.writeHead(200);
        postMessage();
        this.res.end();
    } else {
        console.log("don't care");
        this.res.writeHead(200);
        this.res.end();
    }
}

function postMessage() {
  var botResponse, options, body, botReq;

  botResponse = cool();

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


exports.respond = respond;
