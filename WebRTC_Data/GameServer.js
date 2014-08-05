"use strict";

function GameServer() {
  this.server = new HackathonServer(FIREBASE_URL.SERVER);
  this.server.onusermessage = this.onMessage.bind(this);
  this.server.onuserconnected = this.onUserConnected.bind(this);
  this.server.onuserdisconnected = this.onDisconnect.bind(this);
}
GameServer.prototype = Object.create(Object.prototype, {

  state :  {writable: true, enumerable: true, value: {} },

  onUserConnected : {enumerable: true, value: function(ref){
      this.state[ref] = true;
    }
  },

  onDisconnect :{enumerable: true, value: function(ref){
      delete this.state[ref];
    }
  },
  onMessage : {enumerable: true, value: function(ref, arraybuffer){
      for(var i in this.state) {
        if(i != ref) {
          this.sendMessage(i, arraybuffer);
        }
      }
    }
  },
  sendMessage : {enumerable: true, value: function(ref, arraybuffer){
      this.server.sendMessage(ref, arraybuffer);
    }
  }
});

