sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment"
], function (Controller, MessageBox, MessageToast, Filter, FilterOperator, Sorter, JSONModel, Fragment) {
  "use strict";

  var URL_REGEX = /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}$/i;

  return Controller.extend("watch.watches.controller.WatchList", {

    onInit: function () {
      this.getView().setModel(new JSONModel({
        statusFilter: "ALL",
        kpi: { total: 0, active: 0, paused: 0, triggered: 0 }
      }), "ui");
      this._refreshKpis();
    },

    _t: function (sKey, aArgs) {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    },

    // ── KPIs ──────────────────────────────────────────

    /**
     * Calcula los contadores del dashboard consultando el servicio OData.
     */
    _refreshKpis: function () {
      var oModel = this.getOwnerComponent().getModel();
      var oUi = this.getView().getModel("ui");
      var sUrl = oModel.getServiceUrl() + "Watches?$select=status";

      fetch(sUrl, { headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (oData) {
          var aItems = oData.value || [];
          var fnCount = function (s) {
            return aItems.filter(function (o) { return o.status === s; }).length;
          };
          oUi.setProperty("/kpi", {
            total: aItems.length,
            active: fnCount("ACTIVE"),
            paused: fnCount("PAUSED"),
            triggered: fnCount("TRIGGERED")
          });
        })
        .catch(function () { /* KPIs son informativos */ });
    },

    onKpiPress: function (oEvent) {
      var sStatus = oEvent.getSource().data("status");
      this.getView().getModel("ui").setProperty("/statusFilter", sStatus);
      this.onFilterChange();
    },

    // ── Filtros y orden ───────────────────────────────

    /**
     * Aplica estado, tipo, frecuencia, búsqueda y orden a la tabla.
     */
    onFilterChange: function () {
      var oView = this.getView();
      var oBinding = oView.byId("watchesTable").getBinding("items");
      var sStatus = oView.getModel("ui").getProperty("/statusFilter");
      var sType = oView.byId("selectTypeFilter").getSelectedKey();
      var sFreq = oView.byId("selectFrequencyFilter").getSelectedKey();
      var sQuery = (oView.byId("searchField").getValue() || "").trim();
      var aSort = oView.byId("selectSort").getSelectedKey().split(":");
      var aFilters = [];

      if (sStatus && sStatus !== "ALL") {
        aFilters.push(new Filter("status", FilterOperator.EQ, sStatus));
      }
      if (sType && sType !== "ALL") {
        aFilters.push(new Filter("type", FilterOperator.EQ, sType));
      }
      if (sFreq && sFreq !== "ALL") {
        aFilters.push(new Filter("frequency", FilterOperator.EQ, sFreq));
      }
      if (sQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("name", FilterOperator.Contains, sQuery),
            new Filter("url", FilterOperator.Contains, sQuery)
          ],
          and: false
        }));
      }

      oBinding.filter(aFilters);
      oBinding.sort(new Sorter(aSort[0], aSort[1] === "desc"));
    },

    // ── Navegación ────────────────────────────────────

    onWatchPress: function (oEvent) {
      var oContext = oEvent.getSource().getBindingContext();
      this.getOwnerComponent().getRouter().navTo("WatchDetail", {
        id: oContext.getProperty("ID")
      });
    },

    // ── Validación ────────────────────────────────────

    onNameLiveChange: function (oEvent) {
      this._validateName(oEvent.getSource());
    },

    onUrlLiveChange: function (oEvent) {
      this._validateUrl(oEvent.getSource());
    },

    _validateName: function (oInput) {
      var bOk = oInput.getValue().trim().length > 0;
      oInput.setValueState(bOk ? "None" : "Error");
      oInput.setValueStateText(this._t("errNameRequired"));
      return bOk;
    },

    _validateUrl: function (oInput) {
      var bOk = URL_REGEX.test(oInput.getValue().trim());
      oInput.setValueState(bOk ? "None" : "Error");
      oInput.setValueStateText(this._t("errUrlInvalid"));
      return bOk;
    },

    // ── Diálogo de edición ────────────────────────────

    onEditPress: function (oEvent) {
      this._openEditDialog(oEvent.getSource().getBindingContext());
    },

    _openEditDialog: function (oContext) {
      var oView = this.getView();
      this._oEditContext = oContext;

      if (!this._pEditDialog) {
        this._pEditDialog = Fragment.load({
          id: oView.getId(),
          name: "watch.watches.view.EditWatch",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          return oDialog;
        });
      }

      this._pEditDialog.then(function (oDialog) {
        var oName = oView.byId("editInputName");
        var oUrl = oView.byId("editInputUrl");
        oName.setValue(oContext.getProperty("name")).setValueState("None");
        oUrl.setValue(oContext.getProperty("url")).setValueState("None");
        oView.byId("editSelectType").setSelectedKey(oContext.getProperty("type"));
        oView.byId("editInputCondition").setValue(oContext.getProperty("condition") || "");
        oView.byId("editSelectFrequency").setSelectedKey(oContext.getProperty("frequency"));
        oView.byId("editSelectStatus").setSelectedKey(oContext.getProperty("status"));
        oDialog.open();
      });
    },

    onEditSavePress: function () {
      var oView = this.getView();
      var oContext = this._oEditContext;
      var that = this;

      var bOk = this._validateName(oView.byId("editInputName"));
      bOk = this._validateUrl(oView.byId("editInputUrl")) && bOk;
      if (!bOk) {
        return;
      }

      var sCondition = oView.byId("editInputCondition").getValue().trim();
      var mChanges = {
        name:      oView.byId("editInputName").getValue().trim(),
        url:       oView.byId("editInputUrl").getValue().trim(),
        type:      oView.byId("editSelectType").getSelectedKey(),
        condition: sCondition || null,
        frequency: oView.byId("editSelectFrequency").getSelectedKey(),
        status:    oView.byId("editSelectStatus").getSelectedKey()
      };

      var aPromises = Object.keys(mChanges).map(function (sKey) {
        if (oContext.getProperty(sKey) !== mChanges[sKey]) {
          return oContext.setProperty(sKey, mChanges[sKey]);
        }
        return Promise.resolve();
      });

      Promise.all(aPromises).then(function () {
        MessageToast.show(that._t("msgUpdated"));
        that._refreshKpis();
      }).catch(function (oError) {
        MessageBox.error(that._t("errUpdate", [oError.message]));
      });

      this._pEditDialog.then(function (oDialog) {
        oDialog.close();
      });
    },

    onEditCancelPress: function () {
      this._pEditDialog.then(function (oDialog) {
        oDialog.close();
      });
    },

    // ── Pausar / activar ──────────────────────────────

    onToggleStatus: function (oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext();
      var sNew = oContext.getProperty("status") === "ACTIVE" ? "PAUSED" : "ACTIVE";

      oContext.setProperty("status", sNew).then(function () {
        MessageToast.show(that._t(sNew === "PAUSED" ? "msgPaused" : "msgActivated"));
        that._refreshKpis();
      }).catch(function (oError) {
        MessageBox.error(that._t("errToggle", [oError.message]));
      });
    },

    // ── Diálogo de creación ───────────────────────────

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

    onDialogCreatePress: function () {
      var oView = this.getView();
      var that = this;

      var bOk = this._validateName(oView.byId("inputName"));
      bOk = this._validateUrl(oView.byId("inputUrl")) && bOk;
      if (!bOk) {
        return;
      }

      var sName      = oView.byId("inputName").getValue().trim();
      var sCondition = oView.byId("inputCondition").getValue().trim();
      var oListBinding = oView.byId("watchesTable").getBinding("items");

      var oContext = oListBinding.create({
        name:      sName,
        url:       oView.byId("inputUrl").getValue().trim(),
        type:      oView.byId("selectType").getSelectedKey(),
        condition: sCondition || null,
        frequency: oView.byId("selectFrequency").getSelectedKey(),
        status:    "ACTIVE"
      });

      oContext.created().then(function () {
        oListBinding.refresh();
        MessageToast.show(that._t("msgCreated", [sName]));
        that._refreshKpis();
      }).catch(function (oError) {
        MessageBox.error(that._t("errCreate", [oError.message]));
      });

      this._resetCreateDialog();
      this._pCreateDialog.then(function (oDialog) {
        oDialog.close();
      });
    },

    onDialogCancelPress: function () {
      this._resetCreateDialog();
      this._pCreateDialog.then(function (oDialog) {
        oDialog.close();
      });
    },

    _resetCreateDialog: function () {
      var oView = this.getView();
      oView.byId("inputName").setValue("").setValueState("None");
      oView.byId("inputUrl").setValue("").setValueState("None");
      oView.byId("selectType").setSelectedKey("PRICE");
      oView.byId("inputCondition").setValue("");
      oView.byId("selectFrequency").setSelectedKey("DAILY");
    },

    // ── Eliminación ───────────────────────────────────

    onDeleteWatch: function (oEvent) {
      var that = this;
      var oContext = oEvent.getParameter("listItem").getBindingContext();
      var sName = oContext.getProperty("name");

      MessageBox.confirm(this._t("confirmDelete", [sName]), {
        title: this._t("confirmDeleteTitle"),
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            oContext.delete().then(function () {
              MessageToast.show(that._t("msgDeleted"));
              that._refreshKpis();
            }).catch(function (oError) {
              MessageBox.error(that._t("errDelete", [oError.message]));
            });
          }
        }
      });
    }

  });
});
