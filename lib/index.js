'use strict';

const Logger = require('./Logger');
const SessionHandler = require('./SessionHandler');

const logger = new Logger();

// The callstats.io main module.
let callstatsModule;

// Supported sip.js 0.7.8, and latest version
function legacySupport(session) {
    return new Promise((resolve, reject) => {
      if(!session) {
        reject(new Error('Session is empty'));
        return ;
      }
      // If mediaHandler property is already present
      if (session.mediaHandler) {
        resolve(session);
        return ;
      }
      // If sessionDescriptionHandler is already present
      if (session.sessionDescriptionHandler) {
        session.mediaHandler = session.sessionDescriptionHandler;
        resolve(session);
        return ;
      }
      // Wait for SessionDescriptionHandler-created event
      session.on('SessionDescriptionHandler-created', function() {
        session.mediaHandler = session.sessionDescriptionHandler;
        resolve(session);
      });

    });
}

/**
 * Handles a SIP.UA instance and initializes a callstats object.
 * @param  {SIP.UA} ua - The SIP.UA instance.
 * @param  {string} AppID - Same as in callstats.initialize().
 * @param  {string} AppSecretOrTokenGenerator - Same as in callstats.initialize().
 * @param  {string|object} [localUserID] - Same as in callstats.initialize().
 *                                         If unset, UA's identity is used.
 * @param  {function} [csInitCallback] - Same as in callstats.initialize().
 * @param  {function} [csStatsCallback] - Same as in callstats.initialize().
 * @param  {object} [configParams] - Same as in callstats.initialize().
 */
function handle(ua, AppID, AppSecretOrTokenGenerator, localUserID, csInitCallback, csStatsCallback, configParams) {
  logger.debug('handle() [AppID:"%s"]', AppID);

  // If unset, set callstatsModule with window.callstats
  callstatsModule = callstatsModule || window.callstats;

  if (typeof callstatsModule !== 'function') {
    throw new TypeError('callstatsModule not found');
  }

  if (typeof ua !== 'object') {
    throw new TypeError('ua argument must be a SIP.UA instance');
  }

  if (!localUserID) {
    localUserID = {
      userName  : ua.configuration.displayName,
      aliasName : ua.configuration.uri.toString()
    };
  }

  if (!csInitCallback) {
    csInitCallback = (csError, csErrMsg) => {
      if (csError === 'success') {
        logger.debug('csInitCallback success: %s', csErrMsg);
      } else {
        logger.warn('csInitCallback %s: %s', csError, csErrMsg);
      }
    };
  }

  // Create and initialize the callstats object.

  let callstats = callstatsModule();

  callstats.initialize(AppID, AppSecretOrTokenGenerator, localUserID, csInitCallback, csStatsCallback, configParams);

  function inviteEvent(session) {
    legacySupport(session).then((csioSession) => {
        let request = csioSession.request;
        let conferenceID = csioSession.data.conferenceID || request.call_id || request.callId;
        let sessionHandler = new SessionHandler(csioSession, conferenceID, callstats);
        // Store the SessionHandler into the SIP.Session data object.
        csioSession.data.callstatsSessionHandler = sessionHandler;
    });
  }

  // React on new SIPjs sessions.
  ua.on('invite', inviteEvent);
  ua.on('inviteSent', inviteEvent);
};

/**
 * Set the callstats main module.
 * @param  {function} module - The callstats.io main module.
 */
handle.setCallstatsModule = function(mod) {
  logger.debug('setCallstatsModule()');

  callstatsModule = mod;
};

module.exports = handle;
