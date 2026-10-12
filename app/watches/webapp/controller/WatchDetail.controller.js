sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
  "use strict";

  return Controller.extend("watch.watches.controller.WatchDetail", {

    onInit: function () {
      this.getOwnerComponent().getRouter()
        .getRoute("WatchDetail")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _t: function (sKey, aArgs) {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    },

    _onRouteMatched: function (oEvent) {
      var sId = oEvent.getParameter("arguments").id;
      this.getView().bindElement({ path: "/Watches(" + sId + ")" });
    },

    onNavBack: function () {
      this.getOwnerComponent().getRouter().navTo("WatchList", {}, true);
    },

    onOpenUrl: function () {
      var sUrl = this.getView().getBindingContext().getProperty("url");
      if (sUrl) {
        window.open(sUrl, "_blank", "noopener");
      }
    },

    onToggleStatus: function () {
      var that = this;
      var oContext = this.getView().getBindingContext();
      var sNew = oContext.getProperty("status") === "ACTIVE" ? "PAUSED" : "ACTIVE";

      oContext.setProperty("status", sNew).then(function () {
        MessageToast.show(that._t(sNew === "PAUSED" ? "msgPaused" : "msgActivated"));
      }).catch(function (oError) {
        MessageBox.error(that._t("errToggle", [oError.message]));
      });
    },

    onDelete: function () {
      var that = this;
      var oContext = this.getView().getBindingContext();

      MessageBox.confirm(this._t("confirmDelete", [oContext.getProperty("name")]), {
        title: this._t("confirmDeleteTitle"),
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            oContext.delete().then(function () {
              MessageToast.show(that._t("msgDeleted"));
              that.onNavBack();
            }).catch(function (oError) {
              MessageBox.error(that._t("errDelete", [oError.message]));
            });
          }
        }
      });
    }

  });
});
