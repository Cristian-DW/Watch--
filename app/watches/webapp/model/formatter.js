sap.ui.define([], function () {
  "use strict";

  var oBundle;

  function text(sKey) {
    return oBundle ? oBundle.getText(sKey) : sKey;
  }

  var TYPE_ICONS = {
    PRICE: "sap-icon://lead",
    STOCK: "sap-icon://shipping-status",
    CONTENT: "sap-icon://document-text",
    CUSTOM: "sap-icon://settings"
  };

  var STATUS_STATES = {
    ACTIVE: "Success",
    PAUSED: "Warning",
    TRIGGERED: "Error",
    ARCHIVED: "None"
  };

  var STATUS_ICONS = {
    ACTIVE: "sap-icon://status-positive",
    PAUSED: "sap-icon://status-inactive",
    TRIGGERED: "sap-icon://status-error",
    ARCHIVED: "sap-icon://status-completed"
  };

  return {
    setBundle: function (oResourceBundle) {
      oBundle = oResourceBundle;
    },

    typeText: function (s) { return s ? text("type." + s) : ""; },
    typeIcon: function (s) { return TYPE_ICONS[s] || "sap-icon://question-mark"; },
    frequencyText: function (s) { return s ? text("frequency." + s) : ""; },
    statusText: function (s) { return s ? text("status." + s) : ""; },
    statusState: function (s) { return STATUS_STATES[s] || "None"; },
    statusIcon: function (s) { return STATUS_ICONS[s] || ""; },

    toggleIcon: function (s) {
      return s === "ACTIVE" ? "sap-icon://media-pause" : "sap-icon://media-play";
    },
    toggleTooltip: function (s) {
      return s === "ACTIVE" ? text("tooltipPause") : text("tooltipActivate");
    },
    canToggle: function (s) {
      return s === "ACTIVE" || s === "PAUSED";
    }
  };
});
