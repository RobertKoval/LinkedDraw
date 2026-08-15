(function (LD) {
  'use strict';

  function isAllowedMediaUrl(value, options) {
    try {
      var url = new URL(value);
      var host = url.hostname.toLowerCase();
      var productionHost = host === 'linkedin.com' || host.endsWith('.linkedin.com') || host === 'licdn.com' || host.endsWith('.licdn.com');
      if (productionHost) return url.protocol === 'https:';
      var allowDevelopment = Boolean(options && options.allowDevelopment);
      var developmentHost = host === '127.0.0.1' || host === 'localhost';
      return allowDevelopment && developmentHost && (url.protocol === 'http:' || url.protocol === 'https:');
    } catch {
      return false;
    }
  }

  function isProductionMediaUrl(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== 'https:') return false;
      var host = url.hostname.toLowerCase();
      return host === 'linkedin.com' || host.endsWith('.linkedin.com') || host === 'licdn.com' || host.endsWith('.licdn.com');
    } catch {
      return false;
    }
  }

  LD.urlPolicy = {
    isAllowedMediaUrl: isAllowedMediaUrl,
    isProductionMediaUrl: isProductionMediaUrl
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
