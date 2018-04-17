var messages = $("#messages");
var messageBox = $('#m');

// Client alias
var alias = null;
$.getJSON('/api/alias', function(data){
  $.each(data, function(i, field){
    if (i === "alias") alias = field
  });
});

// Client netid
var netid = null;
$.getJSON('/api/netid', function(data){
  $.each(data, function(i, field){
    if (i === "netid") netid = field
  });
});

// id of room
var roomId = String(window.location.href.match(/\/chat\/(.*)$/)[1]);
var mods = []  // list of mods

var socket = null;

$(function () {

    // Add new chat message
    function createChatMessage(msg, msg_alias, msg_netid, msg_id){
      // Message sender
      var who = 'other';
      if (msg_netid === netid) { who = 'me' } //from self
      if (mods.includes(msg_netid)) { who += ' mod' } //from mod

      var user = msg_alias;
      if (mods.includes(msg_netid)) { user = '<span class="glyphicon glyphicon-user"></span>' + msg_netid }
      var li = $(
        '<li id=' + msg_id + 
          ' class="msg ' + who + '">'+
          '<p>' + (mods.includes(netid)? 
          '<a class="glyphicon glyphicon-remove mod-only deleteButton" onclick="deleteMessage(\'' + msg_id + '\');"></a>':'') +
          '<b>' + user + ':</b> ' + msg + '</p>' +
        '</li>');

      messages.append(li);
    }

    // Create status messages
    function createStatusMessage(usr_alias, status) {
      var li = '';
      if (status === "joined") {
        li = $( '<li class="status text-center"><b>' + usr_alias + "</b> just joined</li>") 
      }
      else if (status === "left") {
        li = $( '<li class="status text-center"><b>' + usr_alias + "</b> just left</li>") 
      }
      messages.append(li);
    }

    // Populate previous messages and mods
    $.get('/api/chatrooms/id/' + roomId, {}, function(data){
      if (data != null) { 
        mods = data.mods; 
        for (i in data.messages) {
          createChatMessage(data.messages[i].text, 
            data.messages[i].senderAlias,
            data.messages[i].senderNetid, 
            data.messages[i]._id)
        }
      }
    }); 

    // connect to socket
    socket = io();
    
    // On connection to server get the id of person's room
    socket.on('connect', function(){
      console.log("connecting");
      socket.emit('cnct', {alias: alias, roomId: roomId});
    });

    // New user connected to the chatroom
    socket.on('joined', function(data) {
      createStatusMessage(data.alias, "joined");
    })

    // A user left the chatroom
    socket.on('left', function(data) {
      createStatusMessage(data.alias, "left");
    })

    // Receive chat message
    socket.on('receive', function(data){
      createChatMessage(data.msg, data.alias, data.netid, data.msgId)
    });

    // Remove message display
    socket.on('delete', function(data){
      var element = document.getElementById(data.msgId);
      element.innerHTML = "<b>Deleted by a moderator</b>"
    });

    // send messages
    $('form').submit(function(){
      //console.log(messageBox.val());
      msgId = 0;
      msg = messageBox.val()
      socket.emit('chat message', 
        {alias: alias, netid: netid, roomId: roomId, msgId: msgId, msg: msg},
        function(res) {
          createChatMessage(msg, alias, netid, res);
        });
      messageBox.val('');
      return false;
    });

    // Send message by clicking Enter but don't refresh the page
    messageBox.keydown(function (event) {
      var keypressed = event.keyCode || event.which;
      if (keypressed == 13) {
        event.preventDefault();
        $(this).closest('form').submit();
      }
    });

});

// Delete message after a mod clicks on the cross button
function deleteMessage(msg_id){
  $.get('/chat/'+ roomId +'/delete/' + msg_id, {}, function(data){
    if (data == "OK") {
      socket.emit('delete', {msgId: msg_id, roomId: roomId});
      var element = document.getElementById(msg_id);
      element.innerHTML = "<b>Deleted by a moderator</b>"
    }
  });
};
