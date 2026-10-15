sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel",
  "watch/watches/model/formatter"
], function (UIComponent, JSONModel, formatter) {
  "use strict";

  return UIComponent.extend("watch.watches.Component", {

    metadata: {
      manifest: "json"
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      formatter.setBundle(this.getModel("i18n").getResourceBundle());
      this.getRouter().initialize();
    }

  });
});
