'use strict';

const Logger = require('./Logger');

const logger = new Logger('SessionHandler');

class SessionHandler
{
  constructor(session, conferenceID, callstats) {
    logger.debug('constructor()');

    // Private properties.
    this._session = session;
    this._mediaHandler = session.mediaHandler;
    this._conferenceID = conferenceID;
    this._callstats = callstats;
    this._peerconnection = session.mediaHandler.peerConnection;

    // Create a new callstats fabric.
    this._callstats.addNewFabric(
      // pcObject
      this._peerconnection,
      // remoteUserID
      {
        userName  : this._session.remoteIdentity.displayName,
        aliasName : this._session.remoteIdentity.uri.toString()
      },
      // fabricUsage (TODO)
      this._callstats.fabricUsage.multiplex,
      // conferenceID
      this._conferenceID,
      // pcCallback
      (err, msg) => {
        if (err === 'success')
          logger.debug('pcCallback success: %s', msg);
        else
          logger.warn('pcCallback %s: %s', err, msg);
      }
    );

    // React on session & mediaHandler events.
    this._mediaHandler.on('userMediaFailed', (error) => {
      logger.warn('mediaHandler "userMediaFailed" event [error:%o]', error);
      this._reportError(this._callstats.webRTCFunctions.getUserMedia, error);
    });

    this._mediaHandler.on('peerConnection-createOfferFailed', (error) => {
      logger.warn('mediaHandler "peerConnection-createOfferFailed" event [error:%o]', error);
      this._reportError(this._callstats.webRTCFunctions.createOffer, error);
    });

    this._mediaHandler.on('peerConnection-createAnswerFailed', (error) => {
      logger.warn('mediaHandler "peerConnection-createOfferFailed" event [error:%o]', error);
      this._reportError(this._callstats.webRTCFunctions.createOffer, error);
    });

    this._mediaHandler.on('peerConnection-setLocalDescriptionFailed', (error) => {
      logger.warn('session "peerConnection-setLocalDescriptionFailed" event [error:%o]', error);
      this._reportError(this._callstats.webRTCFunctions.setLocalDescription, error);
    });

    this._mediaHandler.on('peerConnection-setRemoteDescriptionFailed', (error) => {
      logger.warn('session "peerConnection-setRemoteDescriptionFailed" event [error:%o]', error);
      this._reportError(this._callstats.webRTCFunctions.setRemoteDescription, error);
    });

    this._session.on('failed', (response, cause) => {
      this._sendFabricEvent(this._callstats.fabricEvent.fabricTerminated);
      this._mayReportSignalingError('failed', cause);
    });

    this._session.on('terminated', (message, cause) => {
      this._sendFabricEvent(this._callstats.fabricEvent.fabricTerminated);
      this._mayReportSignalingError('terminated', cause);
    });

    this._session.on('cancel', () => {
      this._sendFabricEvent(this._callstats.fabricEvent.fabricTerminated);
    });

    this._session.on('hold', (data) => {
      if (data.originator === 'local' && !this._session.isOnHold().remote) {
        this._sendFabricEvent(this._callstats.fabricEvent.fabricHold);
      } else if (data.originator === 'remote' && !this._session.isOnHold().local) {
        this._sendFabricEvent(this._callstats.fabricEvent.fabricHold);
      }
    });

    this._session.on('unhold', (data) =>
    {
      if (data.originator === 'local' && !this._session.isOnHold().remote) {
        this._sendFabricEvent(this._callstats.fabricEvent.fabricResume);
      } else if (data.originator === 'remote' && !this._session.isOnHold().local) {
        this._sendFabricEvent(this._callstats.fabricEvent.fabricResume);
      }
    });

    this._session.on('muted', (data) => {
      if (data.audio) {
        this._sendFabricEvent(this._callstats.fabricEvent.audioMute);
      }
      if (data.video) {
        this._sendFabricEvent(this._callstats.fabricEvent.videoPause);
      }
    });

    this._session.on('unmuted', (data) => {
      if (data.audio) {
        this._sendFabricEvent(this._callstats.fabricEvent.audioUnmute);
      }
      if (data.video) {
        this._sendFabricEvent(this._callstats.fabricEvent.videoResume);
      }
    });
  }

  get callstats() {
    return this._callstats;
  }

  associateMstWithUserID(userID, SSRC, usageLabel, associatedVideoTag) {
    logger.debug('associatedVideoTag()');

    this._callstats.associateMstWithUserID(
      // pcObject
      this._peerconnection,
      // userID
      userID,
      // conferenceID
      this._conferenceID,
      // SSRC
      SSRC,
      // usageLabel
      usageLabel,
      // associatedVideoTag
      associatedVideoTag
    );
  }

  sendUserFeedback(feedback, pcCallback) {
    logger.debug('sendUserFeedback()');

    this._callstats.sendUserFeedback(
      // conferenceID
      this._conferenceID,
      // feedback
      feedback,
      // pcCallback
      pcCallback
    );
  }

  _sendFabricEvent(fabricEvent) {
    logger.debug('_sendFabricEvent() [fabricEvent:%s]', fabricEvent);

    this._callstats.sendFabricEvent(
      // pcObject
      this._peerconnection,
      // fabricEvent
      fabricEvent,
      // conferenceID
      this._conferenceID
    );
  }

  _reportError(wrtcFuncName, error) {
    if (wrtcFuncName === this._callstats.webRTCFunctions.applicationLog) {
      logger.debug('reportError() [wrtcFuncName:%s, msg:"%s"]', wrtcFuncName, error);
    } else {
      logger.warn('reportError() [wrtcFuncName:%s, error:%o]', wrtcFuncName, error);
    }

    this._callstats.reportError(
      // pcObject
      this._peerconnection,
      // conferenceID
      this._conferenceID,
      // wrtcFuncName
      wrtcFuncName,
      // domError
      error,
      // localSDP
      this._peerconnection.localDescription ? this._peerconnection.localDescription.sdp : null,
      // remoteSDP
      this._peerconnection.remoteDescription ? this._peerconnection.remoteDescription.sdp : null
    );
  }

  _mayReportSignalingError(event, cause) {
    const causes = window.SIP.C.causes;

    if (cause === null) {
      return;
    }

    switch (cause) {
      case causes.BYE:
      case causes.CANCELED:
      case causes.NO_ANSWER:
      case causes.EXPIRES:
      case causes.BUSY:
      case causes.REJECTED:
      case causes.REDIRECTED:
      case causes.UNAVAILABLE:
      case causes.NOT_FOUND:
      case causes.ADDRESS_INCOMPLETE:
      case causes.AUTHENTICATION_ERROR:
      {
        let msg = `call ${event}: ${cause}`;

        this._reportError(this._callstats.webRTCFunctions.applicationLog, msg);
        break;
      }
      default:
      {
        let error = new Error(`call ${event}: ${cause}`);

        this._reportError(this._callstats.webRTCFunctions.signalingError, error);
      }
    }
  }
}

module.exports = SessionHandler;
