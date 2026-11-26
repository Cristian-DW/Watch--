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
        kpi: { total: 0, active: 0, paused: 0, triggered: 0 },
        suggestions: [],
        createForm: {
          isSearch: true,
          isJob: false,
          isProduct: true,
          isUrlRequired: false
        }
      }), "ui");
      this._refreshKpis();
      this._loadSuggestions("");
    },

    _t: function (sKey, aArgs) {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
    },

    // ── KPIs ──────────────────────────────────────────

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

    // ── Autocompletado y Sugerencias ──────────────────

    _loadSuggestions: function (sTerm, sType) {
      var oModel = this.getOwnerComponent().getModel();
      var oUi = this.getView().getModel("ui");
      var sCleanTerm = encodeURIComponent((sTerm || "").replace(/'/g, "''"));
      var sCleanType = encodeURIComponent(sType === "JOB" || sType === "PRODUCT" ? sType : "");
      var sUrl = oModel.getServiceUrl() +
        "suggest(term='" + sCleanTerm + "',type='" + sCleanType + "',category='')";

      fetch(sUrl, { headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (oData) {
          oUi.setProperty("/suggestions", oData.value || []);
        })
        .catch(function () { /* fallback silencioso */ });
    },

    onWatchSuggest: function (oEvent) {
      var sValue = oEvent.getParameter("suggestValue") || "";
      var sType = this.getView().byId("selectType").getSelectedKey();
      this._loadSuggestions(sValue, sType);
    },

    onSuggestionSelected: function (oEvent) {
      var oRow = oEvent.getParameter("selectedRow");
      if (!oRow) {
        return;
      }
      var oCtx = oRow.getBindingContext("ui");
      if (!oCtx) {
        return;
      }
      var oSug = oCtx.getObject();
      var oView = this.getView();

      oView.byId("selectType").setSelectedKey(oSug.type || "PRODUCT");
      this._syncCreateTypeFlags(oSug.type || "PRODUCT");

      oView.byId("inputName").setValue(oSug.title || "").setValueState("None");
      oView.byId("inputQuery").setValue(oSug.query || oSug.title || "");
      if (oSug.category) {
        oView.byId("selectCategory").setSelectedKey(oSug.category);
      }
      oView.byId("inputSubcategory").setValue(oSug.subcategory || "");
      oView.byId("inputLocation").setValue(oSug.location || "");
      oView.byId("inputTargetPrice").setValue(oSug.targetPrice ? String(oSug.targetPrice) : "");
      if (oSug.currency) {
        oView.byId("selectCurrency").setSelectedKey(oSug.currency);
      }
      if (oSug.url) {
        oView.byId("inputUrl").setValue(oSug.url);
      }

      MessageToast.show(this._t("msgSuggestionApplied", [oSug.title, oSug.subcategory || oSug.category]));
    },

    onCreateTypeChange: function (oEvent) {
      var sType = oEvent.getSource().getSelectedKey();
      this._syncCreateTypeFlags(sType);
      this._loadSuggestions(this.getView().byId("inputName").getValue(), sType);
    },

    _syncCreateTypeFlags: function (sType) {
      var bIsJob = sType === "JOB";
      var bIsProduct = sType === "PRODUCT";
      var bIsSearch = bIsJob || bIsProduct;
      this.getView().getModel("ui").setProperty("/createForm", {
        isSearch: bIsSearch,
        isJob: bIsJob,
        isProduct: bIsProduct,
        isUrlRequired: !bIsSearch
      });
      var oCatSelect = this.getView().byId("selectCategory");
      if (oCatSelect) {
        oCatSelect.setSelectedKey(bIsJob ? "JOB_SAP_ERP" : "PROD_FOOTWEAR");
      }
    },

    // ── Filtros y orden ───────────────────────────────

    onFilterChange: function () {
      var oView = this.getView();
      var oBinding = oView.byId("watchesTable").getBinding("items");
      var sStatus = oView.getModel("ui").getProperty("/statusFilter");
      var sType = oView.byId("selectTypeFilter").getSelectedKey();
      var sCategory = oView.byId("selectCategoryFilter").getSelectedKey();
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
      if (sCategory && sCategory !== "ALL") {
        aFilters.push(new Filter("category", FilterOperator.EQ, sCategory));
      }
      if (sFreq && sFreq !== "ALL") {
        aFilters.push(new Filter("frequency", FilterOperator.EQ, sFreq));
      }
      if (sQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("name", FilterOperator.Contains, sQuery),
            new Filter("query", FilterOperator.Contains, sQuery),
            new Filter("subcategory", FilterOperator.Contains, sQuery),
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

    // ── Ejecutar búsqueda inmediata (checkNow) ────────

    onCheckNowPress: function (oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext();
      var sId = oContext.getProperty("ID");
      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = this.getView().byId("watchesTable").getBinding("items");

      MessageToast.show(this._t("msgCheckStarted"));
      fetch(oModel.getServiceUrl() + "Watches(" + sId + ")/WatchService.checkNow", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: "{}"
      })
        .then(function (r) { return r.json(); })
        .then(function (oRes) {
          oListBinding.refresh();
          that._refreshKpis();
          MessageToast.show(that._t("msgCheckDone", [oRes.found || 0, oRes.newItems || 0, oRes.notified || 0]));
        })
        .catch(function (oError) {
          MessageBox.error(that._t("errCheckNow", [oError.message]));
        });
    },

    // ── Validación ────────────────────────────────────

    onNameLiveChange: function (oEvent) {
      var oInput = oEvent.getSource();
      this._validateName(oInput);
      var oQueryInput = this.getView().byId("inputQuery");
      if (oQueryInput && !oQueryInput.getValue().trim()) {
        oQueryInput.setPlaceholder(oInput.getValue().trim() || this._t("placeholderQuery"));
      }
    },

    onUrlLiveChange: function (oEvent) {
      this._validateUrl(oEvent.getSource(), false);
    },

    _validateName: function (oInput) {
      var bOk = oInput.getValue().trim().length >= 2;
      oInput.setValueState(bOk ? "None" : "Error");
      oInput.setValueStateText(this._t("errNameRequired"));
      return bOk;
    },

    _validateUrl: function (oInput, bRequired) {
      var sVal = oInput.getValue().trim();
      if (!sVal && !bRequired) {
        oInput.setValueState("None");
        return true;
      }
      var bOk = URL_REGEX.test(sVal);
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
        oName.setValue(oContext.getProperty("name") || "").setValueState("None");
        oUrl.setValue(oContext.getProperty("url") || "").setValueState("None");
        oView.byId("editSelectType").setSelectedKey(oContext.getProperty("type") || "PRODUCT");
        oView.byId("editSelectCategory").setSelectedKey(oContext.getProperty("category") || "OTHER");
        oView.byId("editInputSubcategory").setValue(oContext.getProperty("subcategory") || "");
        oView.byId("editInputQuery").setValue(oContext.getProperty("query") || "");
        oView.byId("editInputLocation").setValue(oContext.getProperty("location") || "");
        var vTarget = oContext.getProperty("targetPrice");
        oView.byId("editInputTargetPrice").setValue(vTarget !== null && vTarget !== undefined ? String(vTarget) : "");
        oView.byId("editInputNotifyEmail").setValue(oContext.getProperty("notifyEmail") || "");
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
      var sType = oView.byId("editSelectType").getSelectedKey();
      var bUrlRequired = sType !== "JOB" && sType !== "PRODUCT";

      var bOk = this._validateName(oView.byId("editInputName"));
      bOk = this._validateUrl(oView.byId("editInputUrl"), bUrlRequired) && bOk;
      if (!bOk) {
        return;
      }

      var sTarget = oView.byId("editInputTargetPrice").getValue().trim();
      var mChanges = {
        name:        oView.byId("editInputName").getValue().trim(),
        url:         oView.byId("editInputUrl").getValue().trim() || null,
        type:        sType,
        category:    oView.byId("editSelectCategory").getSelectedKey(),
        subcategory: oView.byId("editInputSubcategory").getValue().trim() || null,
        query:       oView.byId("editInputQuery").getValue().trim() || oView.byId("editInputName").getValue().trim(),
        location:    oView.byId("editInputLocation").getValue().trim() || null,
        targetPrice: sTarget ? Number(sTarget) : null,
        notifyEmail: oView.byId("editInputNotifyEmail").getValue().trim() || null,
        condition:   oView.byId("editInputCondition").getValue().trim() || null,
        frequency:   oView.byId("editSelectFrequency").getSelectedKey(),
        status:      oView.byId("editSelectStatus").getSelectedKey()
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
      var that = this;

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
        that._syncCreateTypeFlags(oView.byId("selectType").getSelectedKey());
        that._loadSuggestions("", oView.byId("selectType").getSelectedKey());
        oDialog.open();
      });
    },

    onDialogCreatePress: function () {
      var oView = this.getView();
      var that = this;
      var sType = oView.byId("selectType").getSelectedKey();
      var bIsSearch = sType === "JOB" || sType === "PRODUCT";

      var bOk = this._validateName(oView.byId("inputName"));
      bOk = this._validateUrl(oView.byId("inputUrl"), !bIsSearch) && bOk;
      if (!bOk) {
        return;
      }

      var sName        = oView.byId("inputName").getValue().trim();
      var sQuery       = oView.byId("inputQuery").getValue().trim() || sName;
      var sUrl         = oView.byId("inputUrl").getValue().trim();
      var sTargetPrice = oView.byId("inputTargetPrice").getValue().trim();
      var oListBinding = oView.byId("watchesTable").getBinding("items");

      var oContext = oListBinding.create({
        name:        sName,
        url:         sUrl || null,
        type:        sType,
        category:    oView.byId("selectCategory").getSelectedKey() || null,
        subcategory: oView.byId("inputSubcategory").getValue().trim() || null,
        query:       bIsSearch ? sQuery : null,
        location:    sType === "JOB" ? (oView.byId("inputLocation").getValue().trim() || null) : null,
        targetPrice: (sType === "PRODUCT" && sTargetPrice) ? Number(sTargetPrice) : null,
        currency:    oView.byId("selectCurrency").getSelectedKey() || "COP",
        notifyEmail: oView.byId("inputNotifyEmail").getValue().trim() || null,
        condition:   oView.byId("inputCondition").getValue().trim() || null,
        frequency:   oView.byId("selectFrequency").getSelectedKey(),
        status:      "ACTIVE"
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
      oView.byId("selectType").setSelectedKey("PRODUCT");
      oView.byId("selectCategory").setSelectedKey("PROD_FOOTWEAR");
      oView.byId("inputSubcategory").setValue("");
      oView.byId("inputQuery").setValue("");
      oView.byId("inputLocation").setValue("");
      oView.byId("inputTargetPrice").setValue("");
      oView.byId("selectCurrency").setSelectedKey("COP");
      oView.byId("inputNotifyEmail").setValue("");
      oView.byId("inputCondition").setValue("");
      oView.byId("selectFrequency").setSelectedKey("DAILY");
      this._syncCreateTypeFlags("PRODUCT");
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
