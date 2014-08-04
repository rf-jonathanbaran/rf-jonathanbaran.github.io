'use strict';

function logErr(err) {
	    Console.log(err);
}

var RTC_Config = {"iceServers":[
  {"url":"stun:stunserver.org"},
  {"url": "stun:23.21.150.121"},
  {"url": "stun:stun.l.google.com:19302"},
  {"url":"stun:stun.stunprotocol.org"}
]};

var RTC_Constraints = {
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: true
  },
  optional:[ 
    { DtlsSrtpKeyAgreement: true }
  ]};

function WebRTC_Connection() {
  this.rtcPeerConnection = new window.RTCPeerConnection(RTC_Config, RTC_Constraints);
  this.rtcPeerConnection.onerror = logErr;
  this.rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);
  this.rtcPeerConnection.ondatachannel = this.onDataChannel.bind(this);
  this.rtcPeerConnection.oniceconnectionstatechange = this.onConnectionStateChange.bind(this);
}

WebRTC_Connection.prototype = Object.create(Object.prototype, {
  rtcChannel: {writable: true, enumerable: true},
  rtcSessionDescriptor: {writable: true, enumerable: true},
  rtcICECanidates: {writable: true, enumerable: true, value: []},
  rtcPeerConnection: {writable: true, enumerable: true},
  onsessionready: {writable: true, enumerable: true},

  isReady: {writable: true, enumerable: true, value:false},

  onconnect : {writable: true, enumerable: true, value:function() {
  
  }},

  ondisconnect : {writable: true, enumerable: true, value:function() {
  
  }},

  onConnectionStateChange : {enumerable: true, value:function() {
    var state = this.rtcPeerConnection.iceConnectionState;
    if(state == "disconnected") {
      this.ondisconnect();
    }
  }},

  onSendChannelStateChange : {enumerable: true, value:function() {
      var readyState = this.rtcChannel.readyState;
      if(readyState == "open") {
        this.onconnect();
      }
    }},

  onMessage : {writable: true, enumerable: true, value:function(event) {
      alert(event.data);
    }},

  sendMessage : {enumerable: true, value:function(msg) {
      this.rtcChannel && this.rtcChannel.send(msg);
    }},

  onSDPCreated : {enumerable: true, value:function(sdp) {
      this.rtcSessionDescriptor = sdp;
      this.rtcPeerConnection.setLocalDescription(sdp);
    }},

  setRemoteDescriptorObject : {enumerable: true, value:function(obj) {
      this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(obj.sdp));
      for(var i in obj.ice) {
        var candidate = new RTCIceCandidate(obj.ice[i]);
        this.rtcPeerConnection.addIceCandidate(candidate);
      }
  }},

  onDataChannel : {enumerable: true, value:function(event) {
      console.log('Channel Callback');
      this.rtcChannel = event.channel;
      this.rtcChannel.binaryType = 'arraybuffer';
      this.rtcChannel.onmessage = function(event) {
        this.onMessage(event.data);
      }.bind(this);
      this.rtcChannel.onopen = this.onSendChannelStateChange.bind(this);
      this.rtcChannel.onclose = this.onSendChannelStateChange.bind(this);
      this.rtcChannel.onerror = logErr;
    }},

  onIceCandidate : {enumerable: true, value:function (event) {
      if (event.candidate) {
        this.rtcICECanidates.push(event.candidate);
      }
      if (event.candidate == null) {
        if(this.onsessionready != null && !this.isReady) {
          this.isReady = true;
          this.onsessionready({"sdp": this.rtcSessionDescriptor, "ice": this.rtcICECanidates});
        }
      }
    }},

  close : {enumerable: true, value:function (event) {
    if(this.rtcChannel && this.rtcChannel.close) {
      try{
        this.rtcChannel.close();
      } catch(e) {
      }
    }
    try{
      this.rtcPeerConnection.close();
    } catch(e) {
    }
  }}
});

function WebRTC_OfferConnection() {
  WebRTC_Connection.call(this);
}
WebRTC_OfferConnection.prototype = Object.create(WebRTC_Connection.prototype, {
  createOffer : {enumerable: true, value: function () {
    try{
      this.rtcChannel = this.rtcPeerConnection.createDataChannel('__checkSupport',{reliable: true});
      this.onDataChannel({'channel': this.rtcChannel});
    }catch(e){
      console.log(e);
    }
    this.rtcPeerConnection.createOffer(this.onSDPCreated.bind(this), logErr, RTC_Constraints);
  }},

  acceptAnswer : {enumerable: true, value:function (obj) {
    this.setRemoteDescriptorObject(obj);
  }}
});

function WebRTC_AnswerConnection() {
  WebRTC_Connection.call(this);
}
WebRTC_AnswerConnection.prototype = Object.create(WebRTC_Connection.prototype, {
  createAnswer : {enumerable: true, value:function (obj) {
      this.setRemoteDescriptorObject(obj);
      this.rtcPeerConnection.createAnswer(this.onSDPCreated.bind(this), logErr, RTC_Constraints);
    }}
});
