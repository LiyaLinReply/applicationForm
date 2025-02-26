sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, Fragment) {
    "use strict";

    const LANG_IT = "it";
    const LANG_DEFAULT = 'en';

    return Controller.extend("applicationform.controller.BaseController", {
        // getLang: ISO Lang Code (639-1) 
        getLang: function () {
            let lang = sap.ui.getCore().getConfiguration().getLanguage().slice(0, 2);
            // *** Constrain the allowed language values to Italian ('it') and default (english, 'en')
            return LANG_IT === lang.toLowerCase() ? LANG_IT : LANG_DEFAULT;
        },
        // getCountry: ISO Country Code (639-2) 
        getCountry: function () {
            return window.navigator.language.slice(3);
        },

        getRESTBaseURL: function () {
            const location = String(window.location.host);
            if (location.indexOf("dev-org-santanna-applicationform") > -1) {
                return "";
            }
            return "";
        },

        getRouter: function () {
            return sap.ui.core.UIComponent.getRouterFor(this);
        },

        navigateTo: function (page) {
            this.getOwnerComponent().getRouter().navTo(page);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },
        getTextFor: function (text, aParms) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(text, aParms);
        },

        setNavInfo: function () {
            const urlWindow = window.location.hash;
            console.log("setNavInfo: " + urlWindow);
            const urlRegex = new RegExp("(?<=\/)[^\/]+");

            /*
            * (?<=\/) è un'asserzione positiva di lookbehind che assicura 
            *         che la corrispondenza sia preceduta da un /.
            * [^\/]+ corrisponde a uno o più caratteri che non sono /.
            * Questa regex cattura le parole immediatamente successive ad un /, ignorando 
            * qualsiasi cosa dopo un / successivo.
            * Gli url sono del tipo: #itwebuildnpp-display&/SupplierData/S0029091.
            * 
            * In questo caso vogliamo estrarre supplierDetail, per questo 
            * motivo prendiamo la prima occorenza con match[0]
            */

            const match = urlWindow.match(urlRegex);
            let windowName = "";
            if (match) {
                windowName = match[0]; //Prendo la prima occorenza
                console.log(windowName);
            }
            localStorage.setItem('currentNav', windowName);
        },


        oDataGET: function (that, service, jModel, filter, sorter, topic4Mesg) {
            let oModel = this.getODataModelMainService(),
                errMesgTitle = that.getTextFor("GenericErrorDataReadingMesgTitle"),
                baseErrMesgText = that.getTextFor("GenericErrorDataReadingMesgText") + (topic4Mesg ? (10 === topic4Mesg.charCodeAt(0) ? ':\n' + topic4Mesg : " (" + topic4Mesg + "):") : '');

            let oSorter = [];
            if (sorter)
                oSorter = sorter;

            return new Promise((resolve, reject) => {
                oModel.read(service, {
                    filters: filter,
                    sorters: oSorter,
                    success: function (data) {
                        if (jModel !== "") {
                            var m = new JSONModel(data);
                            m.setSizeLimit(99999);
                            that.setModel(m, jModel);
                        }
                        resolve(data);
                    },
                    error: function (e) {
                        console.error(e);
                        if (topic4Mesg) {
                            try {
                                var errorTopic = JSON.parse(e.responseText).error.message.value;
                                var errMesgText = baseErrMesgText + "\n\n(" + e.statusCode + ")\n" + (errorTopic ? errorTopic : '');
                                that.displayMessage(errMesgText, "error", errMesgTitle);
                            } catch (err) {
                                MessageBox.error(baseErrMesgText);
                            }
                        }
                        reject(e);
                    }
                });
            });
        },
        oDataGETURLParameters: function (that, service, jModel, urlParameters, topic4Mesg) {
            let oModel = this.getODataModelMainService(),
                errMesgTitle = that.getTextFor("GenericErrorDataReadingMesgTitle"),
                baseErrMesgText = that.getTextFor("GenericErrorDataReadingMesgText") + (topic4Mesg ? (10 === topic4Mesg.charCodeAt(0) ? ':\n' + topic4Mesg : " (" + topic4Mesg + "):") : '');

            return new Promise((resolve, reject) => {
                oModel.read(service, {
                    urlParameters: urlParameters,
                    success: function (data) {
                        if (jModel !== "") {
                            var m = new JSONModel(data);
                            m.setSizeLimit(99999);
                            that.setModel(m, jModel);
                        }
                        resolve(data);
                    },
                    error: function (e) {
                        console.error(e);
                        if (topic4Mesg) {
                            try {
                                var errorTopic = JSON.parse(e.responseText).error.message.value;
                                var errMesgText = baseErrMesgText + "\n\n(" + e.statusCode + ")\n" + (errorTopic ? errorTopic : '');
                                that.displayMessage(errMesgText, "error", errMesgTitle);
                            } catch (err) {
                                MessageBox.error(baseErrMesgText);
                            }
                        }
                        reject(e);
                    }
                });
            });
        },

        oDataRestGET: function (that, servicePath, reqHeaders, jModel) {
            let oHeaders = {};

            if (reqHeaders)
                oHeaders = reqHeaders;


            return new Promise((resolve, reject) => {

                $.ajax({
                    url: this.getRESTBaseURL() + servicePath,
                    headers: oHeaders,
                    type: "GET",
                    async: true,

                    success: function (res) {
                        if (jModel !== "") {
                            var m = new JSONModel(res);
                            m.setSizeLimit(99999);
                            that.setModel(m, jModel);
                        }
                        resolve(res);
                    },
                    error: function (e) {
                        reject(e);
                        try {
                            MessageBox.error(`${_this.getTextFor("GenericErrorDataReadingMesgText")}\n\n${serviceName}\n(${e.statusCode}) ${JSON.parse(e.responseText).error.message.value}`);
                        } catch (err) {
                            MessageBox.error(`${_this.getTextFor("GenericErrorDataReadingMesgText")} (${serviceName})`);
                        }
                    }
                });

            });

        },

        oDataPOST: function (that, service, object, msg) {
            const _this = this;
            const oModel = this.getODataModelMainService();

            return new Promise((resolve, reject) => {

                oModel.create(service, object, {
                    success: function (data) { resolve(data) },
                    error: function (e) {
                        console.error(e);
                        if (msg) {
                            try {
                                MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")}\n\n${msg}\n(${e.statusCode}) ${JSON.parse(e.responseText).error.message.value}`);
                            } catch (err) {
                                MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")} (${msg})`);
                            }
                        }
                        reject(e);
                    }
                });

            });
        },

        oDataPUT: function (that, service, key, object, msg) {
            const _this = this;
            const oModel = this.getODataModelMainService();

            return new Promise((resolve, reject) => {

                oModel.metadataLoaded()
                    .then(function () {
                        let sPath = oModel.createKey(service, key);

                        oModel.update("/" + sPath, object, {
                            success: function () { resolve() },
                            error: function (e) {
                                console.error(e);
                                if (!_this.maxLengthMessageError(e.responseText)) {
                                    if (msg) {
                                        try {
                                            MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")}\n\n${msg}\n(${e.statusCode}) ${JSON.parse(e.responseText).error.message.value}`);
                                        } catch (err) {
                                            MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")} (${msg})`);
                                        }
                                    }
                                } else {
                                    e.seeMessageMaxLength = true;
                                }
                                reject(e);
                            }
                        });
                    })
                    .catch(e => {
                        console.error(e);
                        MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")}\n\n${e}`);
                        reject(e);
                    });
            });
        },

        oDataDELETE: function (that, service, objectId, msg) {
            const oModel = this.getODataModelMainService();
            return new Promise((resolve, reject) => {
                let keysString = Object.keys(objectId).map(key => `${key}=${objectId[key]}`).join(',');
                oModel.remove(`${service}(${keysString})`, {
                    success: function (data) { resolve(data) },
                    error: function (e) {
                        console.error(e);
                        if (msg) {
                            try {
                                MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")}\n\n${msg}\n(${e.statusCode}) 
                                    ${JSON.parse(e.responseText).error.message.value}`);
                            } catch (err) {
                                MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")} (${msg})`);
                            }
                        }
                        reject(e);
                    }
                });
            });
        },
        oDataDELETECustom: function (that, service, keys, msg) {
            const oModel = this.getODataModelMainService();
            return new Promise((resolve, reject) => {
                let keysString = Object.keys(keys).map(key => `${key}=guid'${keys[key]}'`).join(',');
                oModel.remove(`${service}(${keysString})`, {
                    success: function (data) { resolve(data) },
                    error: function (e) {
                        console.error(e);
                        if (msg) {
                            try {
                                MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")}\n\n${msg}\n(${e.statusCode}) 
                                    ${JSON.parse(e.responseText).error.message.value}`);
                            } catch (err) {
                                MessageBox.error(`${that.getTextFor("GeneralOperationFailureMsgText")} (${msg})`);
                            }
                        }
                        reject(e);
                    }
                });
            });
        },

        getODataModelMainService: function () {

            return this.getOwnerComponent().getModel("applicationformDataModel");
        },

        genericErrorMsg: function (e, service) {
            console.error(e);
            try {
                let error = JSON.parse(e.responseText).error.message.value,
                    errMsg = service ? `\n\n${service}\n(${e.statusCode}) ${error}` : `\n\n(${e.statusCode}) ${error}`;
                MessageBox.error(`${this.getTextFor("GeneralTextOperationFailureMesgText")}${errMsg}`);
            } catch {
                MessageBox.error(`${this.getTextFor("GeneralTextOperationFailureMesgText")} (${service})`);
            }
        },

        attachmentUploadFile: function (_this, storedFile, url) {
            if (!storedFile) {
                MessageBox.error("Please select a file first.");
                return;
            }

            // Create a FormData object to send the file
            const oFormData = new FormData();
            oFormData.append("file", storedFile);

            return new Promise((resolve, reject) => {
                $.ajax({
                    url: url, // Replace with your backend endpoint
                    method: "POST",
                    data: oFormData,
                    processData: false, // Required for FormData
                    contentType: false, // Required for FormData
                    success: function (response) {
                        resolve(response);
                    },
                    error: function (error) {
                        reject(error);
                        MessageBox.error("Error uploading the file.");
                    }
                });
            });
        },

        postAttachment : async function(_this, storedFile, path){
            if(!storedFile){
                console.log("No attachment found");
                return;
            }
            const fileName = storedFile.name;
            let attachmentID = "";

            await _this.attachmentUploadFile(_this, storedFile, path).then(async (doc) => {
                const attachment = {
                    fileName: fileName,
                    isDeleted: false,
                    guidAttachment_ID: doc.data
                };
                return await _this.oDataPOST(_this, "/Attachment", attachment, "Attachment").then((createdAttachment) => {
                    attachmentID = createdAttachment.ID;
                })
            });

            return attachmentID;
        },
        postAttachmentStudent : async function(_this, storedFile, studentID, path){
            if(!storedFile){
                console.log("No attachment found");
                return;
            }
            const fileName = storedFile.name;
            let attachmentID = "";

            await _this.attachmentUploadFile(_this, storedFile, path).then(async (doc) => {
                const attachment = {
                    fileName: fileName,
                    isDeleted: false,
                    guidAttachment_ID: doc.data,
                    student_ID : studentID
                };
                return await _this.oDataPOST(_this, "/Attachment", attachment, "Attachment").then((createdAttachment) => {
                    attachmentID = createdAttachment.ID;
                })
            });

            return attachmentID;
        },

        oDataGetByPromise: function (_this, entitySet, jModel, filter, sort) {
            return new Promise((resolve, reject) => {
                _this.oDataGET(_this, entitySet, jModel, filter, sort, entitySet).then(() => {
                    resolve();
                }).catch((err) => reject(err));
            });
        },

        generalOpenSelectDialog: function (_this, name, id) {
            Fragment.load({
                name: name,
                controller: _this,
                id: id
            }).then(function (_selectDialog2) {
                return _selectDialog2;
            }.bind(_this));
        },
        manageSelectDialogCancel: function (oEvent) {
            oEvent.getSource().getBinding("items").filter([]);
        },
        retrieveSelectedContexts: function (oEvent) {
            const context = oEvent.getParameter("selectedContexts");
            if (context && context.length) {
                return context.map(cont => cont.getObject());
            } else {
                return null;
            }
        },

        generalCloseDialog: function (_dialog) {
            if (_dialog) {
                _dialog.destroy();
                _dialog = null;
            }
        },

        generalSmartTableOnRebindFilter: function (_this, oEvent, parameters, id) {
            var mBindingParams = oEvent.getParameter("bindingParams");

            var sQuery = _this.byId(id).getValue().trim();
            if (sQuery && sQuery.length > 0 && !sQuery.replace(/\s/g, "") == "") {
                const filters = [
                ];
                parameters.forEach((parameter) => {
                    filters.push(new Filter(parameter, FilterOperator.Contains, sQuery));
                })
                const combinedFilter = new Filter(filters, false);
                mBindingParams.filters.push(combinedFilter);
            }
        },

        generalSelectDialogSearchManage: function (_this, oEvent, parameters) {
            const sValue = oEvent.getParameter("value");
            const oFilter = [
                new Filter("name", FilterOperator.Contains, sValue)
            ];
            parameters.forEach((parameter) => {
                oFilter.push(new Filter(parameter, FilterOperator.Contains, sQuery));
            });
            const oBinding = oEvent.getParameter("itemsBinding");
            oBinding.filter([oFilter]);
        },

        checkKeysEmpty: function (arrayObj, keys) {
            let empty = false;
            keys.forEach(key => {
                if (key in arrayObj) {
                    const value = arrayObj[key]
                    if (!value || value == null || value == "") {
                        empty = true;
                    }
                }
            });
            return empty;
        },

        compareSelectedKeys: function (obj1, obj2, keys) {
            for (let key of keys) {
                // If the key is not present in either object, return false
                if (!(key in obj1) || !(key in obj2)) {
                    return false;
                }
                // If the values for the key are not the same, return false
                if (!this._deepEqual(obj1[key], obj2[key])) {
                    return false;
                }
            }
            return true;
        },

        showDeleteMessage: function (_this, mainText, method, oEvent) {
            const message = _this.getTextFor(mainText),
                confirm = _this.getTextFor("GeneralTextConfirm"),
                canc = _this.getTextFor("GeneralTextCancel");
            MessageBox.confirm(message, {
                actions: [canc, confirm],
                onClose: sAction => {
                    if (sAction === confirm) {
                        method(_this, oEvent);
                    }
                }
            });
        },

        getUser : function(_this, url){


            return new Promise((resolve, reject) => {
                $.ajax({
                    url: url, // Replace with your backend endpoint
                    method: "GET",
                    success: function (response) {
                        resolve(response);
                    },
                    error: function (error) {
                        reject(error);
                        MessageBox.error("Error uploading the file.");
                    }
                });
            });
        },

        _deepEqual: function (obj1, obj2) {
            if (obj1 !== obj2) {
                return false;
            }
            if (obj1.length !== obj2.length) {
                return false;
            }

            return true;
        },

    });
});
