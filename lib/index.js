'use strict';

const Logger = require('./Logger');
const SessionHandler = require('./SessionHandler');

const logger = new Logger();

// The callstats.io main module.
let callstatsModule;

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

  if (typeof callstatsModule !== 'function' || typeof callstatsModule !== 'object') {
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
    let request = session.request;
    let conferenceID = session.data.conferenceID || request.call_id;
    let sessionHandler = new SessionHandler(session, conferenceID, callstats);

    // Store the SessionHandler into the SIP.Session data object.
    session.data.callstatsSessionHandler = sessionHandler;
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
