"use strict";

function HackathonClient(firebase_url) {
  if(firebase_url) {
	this.firebase_url = firebase_url;
    this.connectToServer(firebase_url);
  }
}

HackathonClient.prototype = Object.create(Object.prototype, {
  connection : {writable: true, enumerable: true, value: null},

  createGUID : {enumerable: true, value: function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
    }
  },

  connectToServer : {enumerable: true, value: function (firebase_url) {
      Firebase.goOnline( );
      var UUID = localStorage.HackathonClient_UUID || this.createGUID();
      localStorage.HackathonClient_UUID = UUID;
      var ref = new Firebase(firebase_url+"/"+UUID+"/");
      ref.child('answer').remove();
      this.connection = new WebRTC_OfferConnection();
      this.connection.onsessionready = function(sdp) {
        ref.child('answer').on('value', function(snapShot) {
          if(snapShot.val() != null) {
            this.connection.acceptAnswer(JSON.parse(snapShot.val()));
            ref.remove();

            this.connection.onconnect = function() {
              this.onConnected();
            }.bind(this);
            this.connection.ondisconnect = function() {
              this.onDisconnected();
            }.bind(this);
            this.connection.onMessage = function(arraybuffer) {
              this.onMessage(arraybuffer);
            }.bind(this);

            if(!window.HackathonServer) {
              Firebase.goOffline( );
            }
          }
        }.bind(this));
        ref.child('offer').set(JSON.stringify(sdp));
      }.bind(this);
      this.connection.createOffer();
    }
  },
  
  reconnect: {value: function() {
	  this.connectToServer(this.firebase_url);
  }},
  
  sendMessage: { value: function (arraybuffer) {
      this.connection.rtcChannel.send(arraybuffer);
    }
  },

  onmessage : {writable: true, enumerable: true, value: function (arraybuffer) {
      
    }
  }, 

  onMessage : {enumerable: true, value: function (arraybuffer) {
      this.onmessage(arraybuffer);
    }
  },

  onconnected : {writable: true, enumerable: true, value: function () {
      
    }
  }, 

  onConnected : {enumerable: true, value: function () {
      console.log("Client Connected");
      this.onconnected();
    }
  },

  ondisconnected : {writable: true, enumerable: true, value: function (arraybuffer) {
    }
  },

  onDisconnected : {enumerable: true, value: function (arraybuffer) {
      try {
        this.connection.close();
      } catch ( e ) {
      }
      this.ondisconnected();
      console.log("Client Disconnected");
    }
  }
});
