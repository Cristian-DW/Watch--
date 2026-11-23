sap.ui.define([], function () {
  "use strict";

  var oBundle;

  function text(sKey) {
    return oBundle ? oBundle.getText(sKey) : sKey;
  }

  var TYPE_ICONS = {
    JOB: "sap-icon://employee-lookup",
    PRODUCT: "sap-icon://cart",
    PRICE: "sap-icon://lead",
    STOCK: "sap-icon://shipping-status",
    CONTENT: "sap-icon://document-text",
    CUSTOM: "sap-icon://settings"
  };

  var CATEGORY_ICONS = {
    JOB_SAP_ERP: "sap-icon://business-objects-experience",
    JOB_SOFTWARE_DEV: "sap-icon://syntax",
    JOB_CLOUD_DEVOPS: "sap-icon://cloud",
    JOB_DATA_AI: "sap-icon://artificial-intelligence",
    JOB_CYBERSECURITY: "sap-icon://shield",
    JOB_PRODUCT_AGILE: "sap-icon://manager-insight",
    PROD_FOOTWEAR: "sap-icon://retail-store",
    PROD_TECH: "sap-icon://laptop",
    PROD_GAMING: "sap-icon://competitor",
    PROD_HOME: "sap-icon://home",
    PROD_FASHION: "sap-icon://Scissors",
    PROD_SPORTS: "sap-icon://physical-activity",
    OTHER: "sap-icon://tag"
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
    categoryText: function (s) { return s ? text("category." + s) : text("category.OTHER"); },
    categoryIcon: function (s) { return CATEGORY_ICONS[s] || "sap-icon://tag"; },
    frequencyText: function (s) { return s ? text("frequency." + s) : ""; },
    statusText: function (s) { return s ? text("status." + s) : ""; },
    statusState: function (s) { return STATUS_STATES[s] || "None"; },
    statusIcon: function (s) { return STATUS_ICONS[s] || ""; },

    isSearchType: function (s) {
      return s === "JOB" || s === "PRODUCT";
    },
    isJobType: function (s) {
      return s === "JOB";
    },
    isProductType: function (s) {
      return s === "PRODUCT";
    },
    isUrlType: function (s) {
      return s && s !== "JOB" && s !== "PRODUCT";
    },

    formatMoney: function (vValue, sCurrency) {
      if (vValue === null || vValue === undefined || vValue === "") {
        return "—";
      }
      var n = Number(vValue);
      if (isNaN(n)) {
        return String(vValue);
      }
      var sCurr = sCurrency || "COP";
      try {
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: sCurr,
          maximumFractionDigits: sCurr === "COP" ? 0 : 2
        }).format(n);
      } catch (e) {
        return n.toLocaleString("es-CO") + " " + sCurr;
      }
    },

    formatSummary: function (sType, sQuery, sUrl, vBestPrice, sBestSource, iResultCount, sCurrency) {
      if (sType === "PRODUCT") {
        if (vBestPrice !== null && vBestPrice !== undefined) {
          return this.formatMoney(vBestPrice, sCurrency) + (sBestSource ? " · " + sBestSource : "");
        }
        return sQuery || "";
      }
      if (sType === "JOB") {
        return (iResultCount || 0) + " " + text("summaryJobsFound") + (sQuery ? " · " + sQuery : "");
      }
      return sUrl || sQuery || "";
    },

    toggleIcon: function (s) {
      return s === "ACTIVE" ? "sap-icon://media-pause" : "sap-icon://media-play";
    },
    toggleTooltip: function (s) {
      return s === "ACTIVE" ? text("tooltipPause") : text("tooltipActivate");
    },
    canToggle: function (s) {
      return s === "ACTIVE" || s === "PAUSED" || s === "TRIGGERED";
    }
  };
});
