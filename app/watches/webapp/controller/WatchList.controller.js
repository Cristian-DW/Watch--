sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (Controller, MessageBox, MessageToast, Filter, FilterOperator) {
  "use strict";

  return Controller.extend("watch.watches.controller.WatchList", {

    onInit: function () {
      // Controller initialization
    },

    /**
     * Filtra la tabla de Watches por nombre.
     */
    onSearch: function (oEvent) {
      var sQuery = oEvent.getParameter("newValue");
      var oTable = this.byId("watchesTable");
      var oBinding = oTable.getBinding("items");
      var aFilters = [];

      if (sQuery && sQuery.length > 0) {
        aFilters.push(
          new Filter("name", FilterOperator.Contains, sQuery)
        );
      }

      oBinding.filter(aFilters);
    },

    /**
     * Placeholder — navegar al detalle de un Watch.
     */
    onWatchPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var oContext = oItem.getBindingContext();
      MessageToast.show("Watch: " + oContext.getProperty("name"));
    },

    /**
     * Placeholder — crear un nuevo Watch.
     */
    onCreateWatch: function () {
      MessageToast.show("Funcionalidad de creación en desarrollo.");
    }

  });
});
