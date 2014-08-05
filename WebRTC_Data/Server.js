"use strict";

function HackathonServer(firebase_url) {
  if(firebase_url) {
    this.ref = new Firebase(firebase_url);
    this.ref.on('value', this.onConnectionChange.bind(this));
  }
}

HackathonServer.prototype = Object.create(Object.prototype, {
  dataChannels : {writeable: true, enumerable: true, value: {} },

  onConnectionChange : {enumerable: true, value: function (dataSnapshot) {
      if(dataSnapshot) 
      dataSnapshot.forEach(function(entry_snapshot) {
          if(entry_snapshot != null && entry_snapshot.child('offer') && entry_snapshot.child('offer').val()) {
            var ref = entry_snapshot.ref();
            var sdp = JSON.parse(entry_snapshot.child('offer').val());
            ref.child('offer').remove();
            this.createNewConnection(ref, sdp);
          }
      }.bind(this));
    }
  },

  createNewConnection : {enumerable: true, value: function (ref, sdp) {
      var remoteDevice = ref.name();
      var PeerConAnswer = new WebRTC_AnswerConnection();
      PeerConAnswer.onsessionready = function(answerSdp) {
        ref.child('answer').set(JSON.stringify(answerSdp));
        PeerConAnswer.onconnect = function() {
          this.onUserConnected(remoteDevice, PeerConAnswer);
        }.bind(this);
        PeerConAnswer.ondisconnect = function() {
          this.onUserDisconnected(remoteDevice, PeerConAnswer);
        }.bind(this);
        PeerConAnswer.onMessage = function(arraybuffer) {
          this.onUserMessage(remoteDevice, arraybuffer);
        }.bind(this);
        
        window.setTimeout(function(){
          if(!this.dataChannels[remoteDevice]) {
            PeerConAnswer.close();
            PeerConAnswer = null;
          }
        }.bind(this), 10000);
      }.bind(this);
      PeerConAnswer.createAnswer(sdp);
    }
  },

  onusermessage : {writable: true, enumerable: true, value: function (ref, arrayBuffer) {
    }
  },

  onUserMessage : {enumerable: true, value: function (ref, arrayBuffer) {
      this.onusermessage(ref,arrayBuffer);
    }
  },

  onuserconnected : {writable: true, enumerable: true, value: function (ref) {
    }
  },

  onUserConnected : {enumerable: true, value: function (ref, PeerConAnswer) {
      this.dataChannels[ref] = PeerConAnswer;
      console.log("onUserConnected: "+ref);
      this.onuserconnected(ref);
    }
  },

  sendMessage : {enumerable: true, value: function (ref, arrayBuffer) {
      try {
        if( this.dataChannels[ref] && this.dataChannels[ref].rtcChannel ) {
          this.dataChannels[ref].rtcChannel.send(arrayBuffer);
        }
      } catch (e) {
      }
    }
  }, 

  onuserdisconnected : {writable: true, enumerable: true, value: function (ref) {
    }
  },
  onUserDisconnected : {enumerable: true, value: function (ref, PeerConAnswer) {
      PeerConAnswer.close();
      delete this.dataChannels[ref];
      console.log("onUserDisconnected: "+ref);
      this.onuserdisconnected(ref);
    }
  }
});
