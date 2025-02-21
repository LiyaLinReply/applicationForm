sap.ui.define([
  "applicationform/controller/BaseController",
  "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
  "use strict";

  return BaseController.extend("applicationform.controller.App", {

      onInit: function () {
          const _this = this;
          var oViewModel = new JSONModel({ busy: false, delay: 0 });
          _this.getView().setModel(oViewModel, "appView");
      }
  });
});