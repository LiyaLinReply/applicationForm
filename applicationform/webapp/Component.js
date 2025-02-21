sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/ui/export/Spreadsheet"
    ],
    function (UIComponent, Device, JSONModel, MessageBox) {
    "use strict";

    return UIComponent.extend("applicationform.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            console.log("You are in the component");
            const _this = this;
            // call the base component's init function
            UIComponent.prototype.init.apply(_this, arguments);

            // set the device model
            // _this.setModel(models.createDeviceModel(), "device");

            // enable routing
            _this.getRouter().initialize();
            const location = String(window.location.hash);
            console.log("The location is ", location);
            _this.getRouter().navTo("ApplicationForm");
        }
    });
});