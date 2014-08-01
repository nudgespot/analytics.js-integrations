
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

/**
 * Expose `Extole` integration.
 */

var Extole = module.exports = integration('Extole')
  .global('extole')
  .option('clientId', '')
  .mapping('conversionEvents')
  .tag('<script src="//tags.extole.com/{{ clientId }}/core.js">');

/**
 * Initialize.
 *
 * @param {Object} page
 */

Extole.prototype.initialize = function(page){
  var self = this;
  if (!self.loaded()) {
    this.load(function() {
      window.extole.mainCb = self.ready;
    });    
  } else {
    self.ready();
  }
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
  var firstScript = document.getElementsByTagName("script")[0];
  var conversionText = JSON.stringify(conversionObj);
  var conversionTag = document.createElement("script");
  
  if (conversionTag.textContent) {
    conversionTag.textContent = conversionText;
  } else if (conversionTag.text) {
    conversionTag.text = conversionText;
  } else {
    conversionTag.innerHTML = conversionText;
  }

  conversionTag.type = "extole/conversion";
  firstScript.parentNode.insertBefore(conversionTag, firstScript);
  return conversionTag;
}

Extole.prototype.track = function(track){
  var event = track.event();
  var conversionMappings = this.conversionEvents(event);
  var conversionObj = { "type" : "purchase", "params" : {} };
  
  // process only if the event is listed in conversionEvents
  if (!conversionMappings.length) {
    return;
  }
  // create and insert Extole's conversion tag  
  each(conversionMappings, function(mappingObject) {
    for (var extoleProp in mappingObject) {
      if (mappingObject.hasOwnProperty(extoleProp)) {
        conversionObj.params[extoleProp] = track.properties()[mappingObject[extoleProp]]; 
      }
    }
  });
  var conversionTag = injectedConversionTag(conversionObj);
  
  // register a conversion with Extole
  if (extole.main && extole.main.fireConversion) {
    extole.main.fireConversion(conversionTag);
  }
};

Extole.prototype.completedOrder = function(track){
  if (Object.keys(this.options.conversionEvents).length) {
    // completedOrder only fires when there is no conversionEvents mapping
    return;
  }
  var user = this.analytics.user();
  var orderId = track.orderId();
  var cart_value = track.revenue();
  var firstScript = document.getElementsByTagName("script")[0];
  // create and insert Extole's conversion tag
  var conversionObj = {
    "type": "purchase",
    "params": {
      "e": user.traits().email,
      "tag:cart_value": cart_value,
      "partner_conversion_id": orderId
    }
  };
  var conversionTag = injectedConversionTag(conversionObj);
  
  // register a conversion with Extole
  if (extole.main && extole.main.fireConversion) {
    extole.main.fireConversion(conversionTag);
  }
};