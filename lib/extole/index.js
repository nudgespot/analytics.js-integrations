
/**
 * Module dependencies.
 */

var integration = require('segmentio/analytics.js-integration');
var Identify = require('facade').Identify;
var Track = require('facade').Track;
var iso = require('to-iso-string');
var clone = require('clone');
var each = require('each');
var bind = require('bind');
var json = require('json');

/**
 * Expose `Extole` integration.
 */

var Extole = module.exports = integration('Extole')
  .global('extole')
  .option('clientId', '')
  .mapping('events')
  .tag('<script src="//tags.extole.com/{{ clientId }}/core.js">');

/**
 * Initialize.
 *
 * @param {Object} page
 */

Extole.prototype.initialize = function(page){
  var self = this;
  if (this.loaded()) return this.ready();
  this.load(function(){
    window.extole.mainCb = self.ready;
  });
};

/**
 * Loaded?
 *
 * @return {Boolean}
 */

Extole.prototype.loaded = function(){
  return !!(window.extole && window.extole.main);
};

/**
 * Completed order.
 *
 * attaches a conversion tag, then tells extole to fire a conversion based on it
 *
 * @param {Track} track
 */

var injectedConversionTag = function(conversionObj) {
  var firstScript = document.getElementsByTagName('script')[0];
  var conversionText = json.stringify(conversionObj);
  var conversionTag = document.createElement('script');

  if (conversionTag.textContent) {
    conversionTag.textContent = conversionText;
  } else {
    conversionTag.text = conversionText;
  }

  conversionTag.type = 'extole/conversion';
  firstScript.parentNode.insertBefore(conversionTag, firstScript);
  return conversionTag;
}

/**
 * Track.
 *
 * @param {Track} track
 */

Extole.prototype.track = function(track){
  var event = track.event();
  var events = this.events(event);
  if (events.length) return this.debug('No events found for %s', event);

  var params = {};
  params['tag:segment_event'] = event;
  var properties = track.properties();
  // create and insert Extole's conversion tag
  each(events, function(mapping){
    each(mapping, function(property, value){
      params[property] = properties[value];
    });
  });

  var conversion = {};
  conversion.type = 'purchase';
  conversion.params = params;
  injectedConversionTag(conversionObj);

  // register a conversion with Extole
  if (extole.main && extole.main.fireConversion) {
    extole.main.fireConversion(conversionTag);
  }
};

/**
 * Completed Order.
 *
 * @param {Track} track
 */

Extole.prototype.completedOrder = function(track){
  if (Object.keys(this.options.conversionEvents).length) {
    // completedOrder only fires when there is no conversionEvents mapping
    return;
  }
  var user = this.analytics.user();
  var orderId = track.orderId();
  var cart_value = track.revenue();
  // create and insert Extole's conversion tag
  var conversionObj = {
    'type': 'purchase',
    'params': {
      'e': user.traits().email,
      'tag:cart_value': cart_value,
      'partner_conversion_id': orderId
    }
  };
  var conversionTag = injectedConversionTag(conversionObj);

  // register a conversion with Extole
  if (extole.main && extole.main.fireConversion) {
    extole.main.fireConversion(conversionTag);
  }
};