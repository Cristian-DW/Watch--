sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Fragment"
], function (Controller, MessageBox, MessageToast, Filter, FilterOperator, Fragment) {
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
     * Navegar al detalle de un Watch (placeholder).
     */
    onWatchPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var oContext = oItem.getBindingContext();
      MessageToast.show("Watch: " + oContext.getProperty("name"));
    },

    // ── Diálogo de creación ───────────────────────────

    /**
     * Abre el diálogo para crear un nuevo Watch.
     */
    onCreateWatch: function () {
      var oView = this.getView();

      if (!this._pCreateDialog) {
        this._pCreateDialog = Fragment.load({
          id: oView.getId(),
          name: "watch.watches.view.CreateWatch",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          return oDialog;
        });
      }

      this._pCreateDialog.then(function (oDialog) {
        oDialog.open();
      });
    },

    /**
     * Crea el Watch con los datos del formulario
     * usando el binding del modelo OData v4.
     */
    onDialogCreatePress: function () {
      var oView = this.getView();
      var sName      = oView.byId("inputName").getValue();
      var sUrl       = oView.byId("inputUrl").getValue();
      var sType      = oView.byId("selectType").getSelectedKey();
      var sCondition = oView.byId("inputCondition").getValue();
      var sFrequency = oView.byId("selectFrequency").getSelectedKey();

      // Validación local básica
      if (!sName || sName.trim().length === 0) {
        MessageBox.error("El nombre es obligatorio.");
        return;
      }
      if (!sUrl || sUrl.trim().length === 0) {
        MessageBox.error("La URL es obligatoria.");
        return;
      }

      var oListBinding = oView.byId("watchesTable").getBinding("items");

      var oContext = oListBinding.create({
        name:      sName.trim(),
        url:       sUrl.trim(),
        type:      sType,
        condition: sCondition ? sCondition.trim() : null,
        frequency: sFrequency,
        status:    "ACTIVE"
      });

      var that = this;

      oContext.created().then(function () {
        MessageToast.show("Watch '" + sName + "' creado correctamente.");
        that._resetCreateDialog();
      }).catch(function (oError) {
        MessageBox.error("Error al crear el Watch: " + oError.message);
      });

      // Cerrar el diálogo inmediatamente;
      // el modelo OData v4 se encarga del submit
      this._pCreateDialog.then(function (oDialog) {
        oDialog.close();
      });
    },

    /**
     * Cierra el diálogo sin crear nada.
     */
    onDialogCancelPress: function () {
      this._resetCreateDialog();
      this._pCreateDialog.then(function (oDialog) {
        oDialog.close();
      });
    },

    /**
     * Limpia los campos del formulario.
     */
    _resetCreateDialog: function () {
      var oView = this.getView();
      oView.byId("inputName").setValue("");
      oView.byId("inputUrl").setValue("");
      oView.byId("selectType").setSelectedKey("PRICE");
      oView.byId("inputCondition").setValue("");
      oView.byId("selectFrequency").setSelectedKey("DAILY");
    },

    /**
     * Eliminar un Watch seleccionado de la tabla.
     */
    onDeleteWatch: function (oEvent) {
      var oItem = oEvent.getParameter("listItem");
      var oContext = oItem.getBindingContext();
      var sName = oContext.getProperty("name");

      MessageBox.confirm(
        "¿Eliminar el Watch '" + sName + "'?",
        {
          title: "Confirmar eliminación",
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              oContext.delete().then(function () {
                MessageToast.show("Watch eliminado.");
              }).catch(function (oError) {
                MessageBox.error("Error al eliminar: " + oError.message);
              });
            }
          }
        }
      );
    }

  });
});
