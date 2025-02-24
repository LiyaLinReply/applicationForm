sap.ui.define([
    "applicationform/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/m/ColumnListItem",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
], function (BaseController, JSONModel, Filter, ColumnListItem, FilterOperator, Fragment, MessageBox, MessageToast) {
    return BaseController.extend("applicationform.controller.ApplicationForm", {
        onInit: function () {
            const _this = this;

            const applicationFormInfo = new JSONModel({
                busy: true,
                step : "personal",
                loadAcademic : false,
                loadHealth : false,
            });

            _this.setModel(applicationFormInfo, "ApplicationFormInfo");
            _this.JModelSetupPersonalInfo(_this);
            _this.setModel(new JSONModel({}), "AcademicInfo");

            window.addEventListener('resize', _this._handleResize.bind(_this));

        },

        onNavigationItemSelect : function(oEvent){
            const _this = this;
            const currentStep = _this.getModel("ApplicationFormInfo");
            var oSideNavigation = _this.byId("applicationFormSideNavigation");
            let selectedStep = oEvent.getParameter("item").getKey();
            let nextStep = selectedStep;
            try {
                switch (selectedStep) {
                    case 'academic':
                        // if(!_this._checkPersonalRequired()){
                        //     MessageBox.warning(_this.getTextFor("GeneralTextNotAllFieldCompiled", []));
                        //     return;
                        // }
                        _this.JModelSetupAcademicInfo();
                        break;
                    case "internship":
                        if(!_this._checkAcademicRequired() || !_this._getInternship()){
                            throw new Error("Not all field compiled");
                        }
                        _this.JModelSetupHealth();
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.log(error);
                nextStep = currentStep.getData().step;
                MessageBox.warning(_this.getTextFor("GeneralTextNotAllFieldCompiled", []));
            }

            currentStep.setProperty("/step", nextStep);
            setTimeout(function() {
                currentStep.setProperty("/step", nextStep);
            }, 0); 
            
        },

        _getNavigationItemByKey : function(key){
            switch (key) {
                case 'personal' : return "__item3";
                case 'academic' : return "__item4";
                case 'internship' : return "__item5";
                case 'health' : return "__item6";
                case 'housing' : return "__item7";
                case 'document' : return "__item8";
                case 'confirmation' : return "__item9";
                default: return "__item3";
            }
        },

        onApplicationFormSavePress : function() {
            const _this = this;
            const personalInformation = _this.getModel("PersonalInfo").getData();
            const programChoice = _this.getModel("ProgramChoice").getData();
            const notMandatory = _this.getModel("PersonalInfoNotMandatory").getData();

            if(!_this._checkPersonalRequired()){
                MessageBox.warning(_this.getTextFor("GeneralTextNotAllFieldCompiled", []));
                return;
            }
            
            _this.savePersonalInformation(personalInformation,  programChoice, notMandatory);
        },


        _checkAllObjectKey : function (object) {
            return (Object.values(object).every(value =>  value != null && value != undefined));
        },

        onApplicationFormNextPress : function(){
            const _this = this;

            var oSideNavigation = _this.byId("applicationFormSideNavigation");
            var currentKey = oSideNavigation.getSelectedKey();

            const currentStep = _this.getModel("ApplicationFormInfo");
            let nextStep = '';
            switch (currentKey) {
                case "personal":
                    // if(!_this._checkPersonalRequired()){
                    //     MessageBox.warning(_this.getTextFor("GeneralTextNotAllFieldCompiled", []));
                    //     return;
                    // }
                    nextStep = "academic";
                    _this.JModelSetupAcademicInfo();
                    break;
                case "academic":
                    // if(!_this._checkAcademicRequired()){
                    //     MessageBox.warning(_this.getTextFor("GeneralTextNotAllFieldCompiled", []));
                    //     return;
                    // }
                    if(!_this._getInternship()){
                        _this.JModelSetupHealth();
                        nextStep = "health";
                    }else{
                        _this.JModelSetupInternship();
                        nextStep = "internship";
                    }
                    break;
                case "internship":
                    if(!_this._checkInternalshipRequired()){
                        MessageBox.warning(_this.getTextFor("GeneralTextNotAllFieldCompiled", []));
                        return;
                    }
                    nextStep = "health";
                    break;
                case "health":
                    nextStep = "housing";
                    break;
                case "housing":
                    nextStep = "flight";
                    break;
                case "flight":
                    nextStep = "document";
                    break;
                case "document":
                    nextStep = "confirmation";
                    break;
                default:
                    nextStep = "personal";
                    break;
            }

            oSideNavigation.setSelectedKey(nextStep);
            currentStep.setProperty("/step", nextStep);
        },

        onApplicationFormBackPress : function(){
            const _this = this;

            var oSideNavigation = _this.byId("applicationFormSideNavigation");
            var currentKey = oSideNavigation.getSelectedKey();

            const currentStep = _this.getModel("ApplicationFormInfo");
            let nextStep = '';
            switch (currentKey) {
                case "academic":
                    nextStep =  "personal";
                    break;
                case "internship":
                    nextStep = "academic";
                    break;
                case "health":
                    if(!_this._getInternship()){
                        nextStep = "academic";
                    }else{
                        nextStep = "internship";
                    }
                    break;
                case "housing":
                    nextStep = "health";
                    break;
                case "flight":
                    nextStep = "housing";
                    break;
                case "document":
                    nextStep = "flight";
                    break;
                case "confirmation":
                    nextStep = "document";
                    break;
                default:
                    nextStep = "personal";
                    break;
            };
            oSideNavigation.setSelectedKey(nextStep);
            currentStep.setProperty("/step", nextStep);
        },

        onExit: function () {
            const _this = this;
            // Remove the resize event listener when the controller is destroyed
            window.removeEventListener('resize', _this._handleResize.bind(_this));
        },

        //-------------------------- Personal Information ---------------------------

        _loadPersonalData : function(){
            const _this = this;
            const promises = [_this.oDataGET(_this, "/Program", "ProgramList", '', '', "ProgramList").then((data) => {
    
                const faculty = data.results.filter(result => result.typeProgram);
                const normal = data.results.filter(result => !result.typeProgram);
                normal.push({name : "Faculty-Led Program", typeProgram : "Faculty-Led Program"});
                _this.setModel(new JSONModel({results:faculty}), "FacultyProgramList");
                _this.setModel(new JSONModel({results : normal}), "ProgramList");
            }),

            _this.oDataGET(_this, "/Hobbie", "HobbyList", [new Filter("isDefault", FilterOperator.EQ, true)], '', 'HobbyList').then((data) => {
                data.results.push({name:"Others", isOther : true});
                _this.setModel(new JSONModel(data), "HobbyList");
            }),
            _this.oDataGET(_this, "/University", "UniversityList", [new Filter("isDefault", FilterOperator.EQ, true)], '', 'UniversityList').then((data) => {
                data.results.push({name:"Others", isOther : true});
                _this.setModel(new JSONModel(data), "UniversityList");
            }),
            _this.oDataGET(_this, "/SexOnPassport", "SexOnPassportList", '', '', 'SexOnPassportList').then((data) => {
            }),
            _this.oDataGET(_this, "/FindOut", "FindOutList", '', '', 'FindOutList').then((data) => {
            }),
            _this.oDataGET(_this, "/Country", "CountryList", '', '', "CountryList"),
            _this.oDataGET(_this, "/FirstLanguage", "FirstLanguageList", '', '', "FirstLanguageList"),
            _this.oDataGET(_this, "/Prefix", "PrefixList", "", "", "PrefixList")
        ];
            Promise.all(
                promises
            ).then((data) => {

            }).catch((err) => {
                console.log(err);
            }).finally(() => {
                _this.getModel("ApplicationFormInfo").setProperty("/busy", false);
            })
        },

        JModelSetupPersonalInfo : function(_this){
            _this._loadPersonalData();
            _this.setModel(new JSONModel(null), "FacultyProgramList");
            _this.setModel(new JSONModel({typeProgram : null}), "ProgramChoice");
            _this.setModel(new JSONModel({uploadedPassport : false}), "passportUpload");
            const personalInfo = {
                firstName : null,
                lastName : null,
                preferredFirstName : null,
                genderIdentity : null,
                dateBirth : null,
                primaryEmailAddress : null,
                cityOfBirth : null,
                stateOfBirth : null,
                countryOfBirth : null,
                mobilePhoneNumber : null,
                mobileNumberPrefix : null,
                universityOther : null,
                emailAddress : null,
                passportNumber : null,
                isMemberOfNiaf : false,
                isMemberOfOsdia : false, 
                firstLanguage_ID : null,
                alternativeEmailAddress : null,
                sexOnPassport_ID: null,
                isItaloAmerican : null,
                guardianName: null,
                passportLater : false,
                country_ID : null,
                relationship : null,
                mobilePhoneNumberParent : null,
                emailAddressParent : null,
                permanentAddressParent : null,
                isGreeklife : false,
                isClubs : false,
                isItaloAmerican : false,
                findOut_ID : null,
            };

            _this.setModel(new JSONModel({results : [{name:"Culinary", }]}), "HobbySet")
            
            _this.setModel(new JSONModel(personalInfo), "PersonalInfo");
            _this.setModel(new JSONModel({}), "PersonalInfoNotMandatory");
            _this.setModel(new JSONModel({street: null, city :null, state : null, zipcode : null, country : null}), "PermanentAddressInfo");
            _this.setModel(new JSONModel({}), "PermanentAddressCountryInfo");
            _this.setModel(new JSONModel({}), "EmergencyContact");
            
        },

        onAfterRendering: function () {
            // Add event listeners for drag and drop area
            const _this = this;
            var oDropArea = _this.byId("dropArea");
            oDropArea.getDomRef().addEventListener("dragover", _this.onDragOver.bind(_this), false);
            oDropArea.getDomRef().addEventListener("dragleave", _this.onDragLeave.bind(_this), false);
            oDropArea.getDomRef().addEventListener("drop", _this.onDrop.bind(_this), false);
        },

        savePersonalInformation : async function (personalInformation, program, notMandatory) {
            const _this = this;
            const allPersonalInfo = {...personalInformation, ...notMandatory, program_ID : program.ID};
            const attachmentID = await _this.postAttachment(_this, _this.oPassportFile,"/REST/v1/documents");

            const permanentAddress = _this.getModel("PermanentAddressInfo").getData();
            let permanentID = null;

            await _this.oDataPOST(_this, "/PermanentAddress", permanentAddress, "PermanentAddressPOST").then((data) => permanentID = data.ID);

            allPersonalInfo.mobilePhoneNumber = allPersonalInfo.mobileNumberPrefix + allPersonalInfo.mobilePhoneNumber;
            const postStudent = {firstName : allPersonalInfo.firstName, lastName : allPersonalInfo.lastName, preferredFirstName : allPersonalInfo.preferredFirstName, isMemberOfOsdia : allPersonalInfo.isMemberOfOsdia,
                genderIdentity : allPersonalInfo.genderIdentity, dateBirth : allPersonalInfo.dateBirth, cityOfBirth : allPersonalInfo.cityOfBirth, stateOfBirth : allPersonalInfo.stateOfBirth, country_ID : allPersonalInfo.country_ID,
                countryOfBirth : allPersonalInfo.countryOfBirth, mobilePhoneNumber : allPersonalInfo.mobilePhoneNumber, passportNumber : allPersonalInfo.passportNumber, isMemberOfNiaf : allPersonalInfo.isMemberOfNiaf,
                firstLanguage_ID : allPersonalInfo.firstLanguage_ID, sexOnPassport_ID : allPersonalInfo.sexOnPassport_ID, isItaloAmerican : allPersonalInfo.isItaloAmerican, parentGuardianName : allPersonalInfo.parentGuardianName,
                relationship : allPersonalInfo.relationship, mobilePhoneNumberParent : allPersonalInfo.mobilePhoneNumberParent, emailAddressParent : allPersonalInfo.emailAddressParent, permanentAddressParent : allPersonalInfo.permanentAddressParent,
                isGreeklife : allPersonalInfo.isGreeklife, isClubs : allPersonalInfo.isClubs, findOut_ID : allPersonalInfo.findOut_ID, homePhoneParent : allPersonalInfo.homePhoneParent, program_ID : allPersonalInfo.program_ID, 
                university_ID : allPersonalInfo.university_ID, permanentAddress_ID : permanentID
            }

            if(allPersonalInfo.isGreeklife){
                postStudent.noteGreeklife = allPersonalInfo.noteGreeklife;
            }
            if(allPersonalInfo.isClubs){
                postStudent.noteClubs = allPersonalInfo.noteClubs;
            }
            if(allPersonalInfo.universityOther){
                postStudent.university_ID = null;
                postStudent.noteHomeInstituion = allPersonalInfo.noteHomeInstituion;
            }

            _this.oDataPOST(_this, "/Student", postStudent, "StudentPost").then((student) => {
                _this.oDataPOST(_this, "/EmailAddress", {emailAddress : allPersonalInfo.primaryEmailAddress}, "EmailAddressPOST").then((email) => {
                    _this.oDataPOST(_this, "/StudentEmail", {student_ID : student.ID, emailAddress_ID : email.ID}, "StudentEmailPost")
                });
                _this.oDataPOST(_this, "/EmailAddress", {emailAddress : allPersonalInfo.alternativeEmailAddress}, "EmailAddressPOST").then((email) => {
                    _this.oDataPOST(_this, "/StudentEmail", {student_ID : student.ID, emailAddress_ID : email.ID},  "StudentEmailPost")
                });

                if(allPersonalInfo.isOtherHobby){
                    _this.oDataPOST(_this, "/Hobbie", {name:allPersonalInfo.otherHobby, isDefault:false}, "HobbyPost").then((hobbie) => {
                        _this.oDataPOST(_this, "/StudentHobbie", {student_ID : student.ID, hobbie_ID : hobbie.ID}, "StudentHobbiePOST");
                    })
                    if(allPersonalInfo.isUlteriorHobby){
                        _this.oDataPOST(_this, "/Hobbie", {name:allPersonalInfo.ulteriorHobby, isDefault:false}, "HobbiePOST").then((hobbie) => {
                            _this.oDataPOST(_this, "/StudentHobbie", {student_ID : student.ID, hobbie_ID : hobbie.ID}, "StudentHobbiePOST");
                        })
                    }
                }else{
                    const hobbies = _this.getModel("choosedHobbies").getData();

                    Promise.all(hobbies.map(item => _this.oDataPOST(_this, "/StudentHobbie", {student_ID : student.ID, hobbie_ID : item}, msg)));
                }

            });
        },

        // Drag Over event handler (showing drag effect)
        onDragOver: function (oEvent) {
            const _this = this;
            oEvent.preventDefault();
            oEvent.stopPropagation();
            // Optionally add styles to show visual cue for drag over
            _this.byId("dropZone").getDomRef().classList.add("dragOver");
        },

        // Drag Leave event handler (remove visual cue)
        onDragLeave: function (oEvent) {
            const _this = this;
            oEvent.preventDefault();
            oEvent.stopPropagation();
            // Remove the drag over effect
            _this.byId("dropZone").getDomRef().classList.remove("dragOver");
        },

        // Drop event handler (handle dropped file)
        onDrop: function (oEvent) {
            const _this = this;
            oEvent.preventDefault();
            oEvent.stopPropagation();

            var oDroppedFile = oEvent.dataTransfer.files[0]; // Get the dropped file

            _this.oPassportFile = oDroppedFile;
            if(_this.oPassportFile){
                _this.setModel(new JSONModel({uploadedPassport : true, filename : oDroppedFile.name}), "passportUpload");
            }
            // Remove the drag effect
            _this.byId("dropZone").getDomRef().classList.remove("dragOver");
        },

        onPassportUpload : function(oEvent){
            const _this = this;
            const oFileUploader = oEvent.getSource();
            const file = oFileUploader.oFileUpload.files[0];
            _this.oPassportFile = file;
            _this.setModel(new JSONModel({uploadedPassport : true, filename : file.name}), "passportUpload");

        },

        onClickRemovePassport : function(){
            const _this = this;
            _this.oPassportFile = null;
            _this.getModel("passportUpload").setProperty("/uploadedPassport", false);
            _this.getModel("passportUpload").setProperty("/filename", null);
        },

        onSelectMobileNumberPrefix : function (oEvent) {
            const _this = this;
            let selectedPrefix = oEvent.getSource().getSelectedItem();
            _this.getModel("PersonalInfo").setProperty("/mobileNumberPrefix", selectedPrefix.getText());
        },
        
        onSelectUniversity : function(oEvent){
            const _this = this;
            let selectedValue = oEvent.getSource().getSelectedItem();
            const notMandatory = _this.getModel("PersonalInfoNotMandatory");
            if(selectedValue.getText() === "Others"){
                _this.getModel("PersonalInfo").setProperty("/universityOther", true);
            }else{
                _this.getModel("PersonalInfo").setProperty("/universityOther", false);
                notMandatory.setProperty("/university_ID", selectedValue.getKey());
            }
        },

        onChooseProgram : function(oEvent, JModel){
            const _this = this;
            let selectedProgram = oEvent.getSource().getSelectedItem().getBindingContext(JModel).getObject();
            const programID = _this.getModel("ProgramChoice").getData().ID;
            if(selectedProgram.ID !== programID){
                _this.getModel("ApplicationFormInfo").setProperty("/loadAcademic", false);
            }
            _this.setModel(new JSONModel(selectedProgram), "ProgramChoice");
        },

        _handleResize : function(){
            const _this = this;
            _this.sidenavBar = _this.byId("applicationFormSideNavigation");
            if (window.innerWidth <= 700) {
                // If yes, collapse the side navigation (toggle expanded to false)
                _this.sidenavBar.setExpanded(false); // Or use addStyleClass to hide if needed
            } else {
                // Optionally, you can expand it again if needed
                _this.sidenavBar.setExpanded(true);
            }
        },

        //// Profile Information
        onSelectSex : function(oEvent) {
            this.setPropertyBySelectKey("PersonalInfo", "/sexOnPassport_ID", oEvent);     
        },

        onSelectCountryCitizenship : function(oEvent){
            this.setPropertyBySelectKey("PersonalInfo", "/country_ID", oEvent);     
        },

        onSelectFirstLanguage : function(oEvent){
            this.setPropertyBySelectKey("PersonalInfo", "/firstLanguage_ID", oEvent);   
        },

        onHowDidYoufindChange : function(oEvent){
            this.setPropertyBySelectKey("PersonalInfo", "/findOut_ID", oEvent);   
        },
        
        onHobbySelectConfirm: function (oEvent) {
            const _this = this;
            let contextValues = _this.retrieveSelectedContexts(oEvent);
            const hobbiesIds = [];
            let choosedHobbies = "";
            let isOther = false;
            contextValues.forEach((value) => {
                if(value.name === "Others"){
                    isOther = true;
                }
                if(value.ID){
                    hobbiesIds.push(value.ID);
                }

                choosedHobbies += value.name + " ";

            });
            _this.setModel(new JSONModel(hobbiesIds), "HobbyIds");
            _this.getModel("PersonalInfo").setProperty("/isOtherHobby", isOther);
            _this.getModel("PersonalInfoNotMandatory").setProperty("/choosedHobbies", choosedHobbies);

        },

        onChooseHobbiesPress : function(){
            const _this = this;
            if(!_this._selectHobbyDialog){
                Fragment.load({
                    name: "applicationform.fragment.personal.SelectHobbyDialog",
                    controller: _this,
                    id: "idPersonalSelectHobby"
                }).then(function (_selectDialog2) {
                    _this._selectHobbyDialog = _selectDialog2;
                    _this.getView().addDependent(_this._selectHobbyDialog);
                    _this._selectHobbyDialog.open();
                }.bind(_this));
            }else{
                _this._selectHobbyDialog.open()
            }
        },

        onDateofBirthChange : function(oEvent){
            const _this = this;
            const oDatePicker = oEvent.getSource();
            const oSelectedDate = oEvent.getSource().getDateValue();

            // Check if the date is selected
            if (oSelectedDate) {
                // Get the current date
                var oCurrentDate = new Date();
                
                // Calculate the user's age
                var age = oCurrentDate.getFullYear() - oSelectedDate.getFullYear();
                var m = oCurrentDate.getMonth() - oSelectedDate.getMonth();
                
                // If the user's birthday hasn't occurred yet this year, subtract 1 from the age
                if (m < 0 || (m === 0 && oCurrentDate.getDate() < oSelectedDate.getDate())) {
                    age--;
                }
                
                // If the user is under 18, show an error message
                if (age < 18) {
                    MessageBox.warning("You must be at least 18 years old.");
                    oDatePicker.setDateValue(null);  // Reset value state if valid
                }
            }
        },

        
        _checkPersonalRequired : function(){
            const _this = this;
            const personalInformation = _this.getModel("PersonalInfo").getData();
            const programChoice = _this.getModel("ProgramChoice").getData();
            const notMandatory = _this.getModel("PersonalInfoNotMandatory").getData();
        
            if(!_this._checkAllObjectKey(personalInformation) || !programChoice.ID || (personalInformation.isClubs && notMandatory.leadershipExperience) || (personalInformation.universityOther && !notMandatory.noteHomeInstituion)){
                return false;
            }
            if((personalInformation.isOtherHobby && !notMandatory.otherHobby) || (!personalInformation.isOtherHobby && _this.getModel("HobbyIds").getData().length === 0)){
                return false;
            }
            if((personalInformation.isGreeklife && !notMandatory.noteGreeklife) || (personalInformation.isClubs && (!notMandatory.noteClubs || !notMandatory.leadershipExperience))){
                return false;
            }
            if(!personalInformation.passportLater &&  !_this.oPassportFile){
                return false;
            }
            return true;
        },
        // ----------------Personal Info ends-------------------------------

        // ----------------Academic Information------------------------------
        JModelSetupAcademicInfo : function(){
            const _this = this;
            applicationFormInfo = _this.getModel("ApplicationFormInfo");
            const choosedProgram = _this.getModel("ProgramChoice").getData();

            if(!applicationFormInfo.getData().loadAcademic){

                const courseCreditChoose = [{name : null}];
                for(i = choosedProgram.minCredits; i < choosedProgram.maxCredits; i++){
                    courseCreditChoose.push({name : i});
                }

                _this.setModel(new JSONModel({results : courseCreditChoose}), "CourseCreditChoose");


                _this.byId("idAcademicSelectYear").setSelectedItem(null);
                _this.byId("idAcademicSelectMajorField").setSelectedItem(null);
                _this.byId("idAcademicSelectGraduationDate").setSelectedItem(null);
                _this.byId("idAcademicSelectCredit").setSelectedItem(null);

                const academicInfo = {
                    major : null,
                    gpa : null,
                    yearSchool_ID : null,
                    majorField_ID : null,
                    graduationDate_ID : null,
                    learningImpairments : false,
                    internshipAvailable : false,
                    internshipRequest : false,
                    courseCredit : null,
                };

                _this.setModel(new JSONModel(academicInfo), "AcademicInfo");
                _this.setModel(new JSONModel({noteLearningImpairments:null, otherYear : false}), "AcademicInfoNotMandatory");
                _this.setModel(new JSONModel({results : []}), "ChoosedCourse");
                _this.setModel(new JSONModel({results : []}), "BlockedCourse");
                _this.loadAcademicDatas(choosedProgram);

                applicationFormInfo.setProperty("/busy", true);

            }
        },


        loadAcademicDatas: function(choosedProgram){
            const _this = this;
            const currentYear = new Date().getFullYear();

            _this.getModel("ApplicationFormInfo").setProperty("/busy", true);


            const listOpe =                 [
                _this.oDataGET(_this, "/ProgramCourse", "CourseList", [new Filter("program_ID", FilterOperator.EQ, choosedProgram.ID)], "", "CourseGet").then((course) => {
                    count = 0;
                    course.results.map(item => {item.internship = (item.courseInternship || item.courseInternshipConstraints); item.isFirstConfirmed=false; item.isFirstSelected = false; item.isSecondConfirmed = false; item.isSecondSelected = false; item.isConstrained = false; item.firstRank=count; item.secondRank=count++;})
                }),
                _this.oDataGET(_this, "/CourseConstraint", "CourseConstraintList", "", "", "CourseConstraintList"),            
                _this.oDataGET(_this, "/YearSchool", "YearSchoolList", "", "", "YearSchoolList").then(data => {
                    data.results.push({academicYear : "Other", isOther : true, ID : 'other'});
                    _this.setModel(new JSONModel(data), "YearSchoolList");
                }),
                _this.oDataGET(_this, "/MajorField", "MajorFieldList", "", "", "MajorFieldList"),
                _this.oDataGET(_this, "/GraduationDate", "GraduationDateList", [new Filter("year", FilterOperator.GE, currentYear), new Filter("year", FilterOperator.LE, currentYear +5)], "", "GraduationDateList")];
            Promise.all(    
                listOpe
            ).then((data) => {

            }).catch((err) => {
                console.log(err);
            }).finally(() =>{
                _this.getModel("ApplicationFormInfo").setProperty("/busy", false);
                _this.getModel("ApplicationFormInfo").setProperty("/loadAcademic", true);
            })
        },

        onChooseAcademicInfo : function(oEvent){
            const _this = this;
            let selectedYear = oEvent.getSource().getSelectedItem().getBindingContext("YearSchoolList").getObject();
            if(selectedYear.isOther){
                _this.getModel("AcademicInfoNotMandatory").setProperty("/otherYear", true);
            }else{
                _this.getModel("AcademicInfoNotMandatory").setProperty("/otherYear", false);
                _this.setPropertyBySelectKey("AcademicInfo", "/yearSchool_ID", oEvent);
            }
            let selectedValue = oEvent.getSource().getSelectedItem();
            _this.getModel("AcademicInfo").setProperty("/internshipAvailable", ["junior", "senior"].includes(selectedValue.getText().toLowerCase()));
        },

        onChooseCourseCredit : function(oEvent) {
            this.setPropertyBySelectKey("AcademicInfo", "/courseCredit", oEvent);
        },

        onChooseMajorField : function(oEvent){
            this.setPropertyBySelectKey("AcademicInfo", "/majorField_ID", oEvent);
        },

        
        onChooseGraduationDate : function(oEvent){
            this.setPropertyBySelectKey("AcademicInfo", "/graduationDate_ID", oEvent);
        },

        onFirstCourseSelectPress : function (){

            const _this = this;

            if(!_this._academicFirstChoice){
                Fragment.load({
                    name: "applicationform.fragment.academic.FirstCourseChoice",
                    controller: _this,
                    id: "idFirstCourseDialog"
                }).then(function (_dialog) {
                    _this._academicFirstChoice = _dialog
                    _this.getView().addDependent(_this._academicFirstChoice);
                    _this._academicFirstChoice.open();
                }.bind(_this));
            }else{
                _this._academicFirstChoice.open();
            }

            
            _this._filterTableByInternship("idFirstCourseDialog", "firstChoiceCourseTable");

        },

        _filterTableByInternship : function(id, fragmentName){
            const oTable = sap.ui.core.Fragment.byId(id, fragmentName);
            if(oTable){
                const oFilter = new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse());
                oTable.getBinding("items").filter([oFilter]);
            }
        },

        _canSeeInternshipCourse : function(){
            const _this = this;
            const academicInfo = _this.getModel("AcademicInfo").getData();
            if(academicInfo && academicInfo.gpa >= 3 && academicInfo.internshipAvailable){
                return true;
            }            
            return false;
        },

        onDialogFirstCourseChoiceClose : function(){
            const _this = this;
            if(_this._academicFirstChoice){
                _this._academicFirstChoice.close();
                _this._academicFirstChoice.destroy();
                _this._academicFirstChoice = null;
            }
        },

        onCourseChoiceCheckBoxSelect: function(oEvent) {
			const _this = this;
            const selectedCourse = oEvent.getSource().getBindingContext("CourseList").getObject();
            const allCourses = _this.getModel("CourseList").getData();
            const allConstraint = _this.getModel("CourseConstraintList").getData();
            const selected = selectedCourse.isFirstSelected;

            const constraints = allConstraint.results.filter(item => item.course_ID === selectedCourse.course_ID || item.courseBlockedBy_ID === selectedCourse.course_ID);
            if(constraints != null && constraints.length > 0){
                constraints.forEach(item => {
                    allCourses.results.map(course => {
                        if(course.course_ID !== selectedCourse.course_ID && (course.course_ID === item.course_ID || course.course_ID === item.courseBlockedBy_ID)){
                            course.isConstrained = selected;
                        }
                        return course;
                    })
                })
                _this.setModel(new JSONModel(allCourses), "CourseList");
            }
		},

        onSearchFirstCourseName : function(oEvent){
            var sQuery = oEvent.getParameter("query").toUpperCase();
            const oTable = sap.ui.core.Fragment.byId("idFirstCourseDialog", "firstChoiceCourseTable");
            const oFilter = new Filter("courseName", FilterOperator.Contains, sQuery);
            const oBinding = oTable.getBinding("items");
            oBinding.filter([oFilter, new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse())]);
        },

        onFilterFirstCourseCredit : function(oEvent){
            let selectedValue = oEvent.getSource().getSelectedItem();
            const oTable = sap.ui.core.Fragment.byId("idFirstCourseDialog", "firstChoiceCourseTable");
            const oBinding = oTable.getBinding("items");

            if(selectedValue.getText()===""){
                oBinding.filter([new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse())]);
            }else{
                const oFilter = new Filter("courseCredit", FilterOperator.EQ, selectedValue.getText());
                oBinding.filter([oFilter, new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse())]);
            }

        },

        onFirstCourseChoiceConfirm : function(oEvent){
            const _this = this;
            const allCourses = _this.getModel("CourseList").getData();
            let count = 0;

            allCourses.results.forEach(item => count = item.isFirstSelected ? count + item.courseCredit : count);

            const program = _this.getModel("ProgramChoice").getData();
            if(count < program.minCredits || count > program.maxCredits){
                MessageBox.warning(_this.getTextFor("AcademicCreditOutRange", []));
            }

            allCourses.results.map(item => {
                if(item.isFirstSelected){
                    item.isFirstConfirmed = true;
                    count += item.courseCredit;
                }else{
                    item.isFirstConfirmed = false;
                }
            });
            _this.setModel(new JSONModel(allCourses), "CourseList");
            _this.onDialogFirstCourseChoiceClose();
        },

        

        onSecondCourseSelectPress : function (){
            const _this = this;
            const allCourses = _this.getModel("CourseList").getData();
            let choosedFirstCourse = true;

            allCourses.results.forEach(item => {
                if(item.isFirstConfirmed){
                    choosedFirstCourse=false;
                }
            });

            if(choosedFirstCourse){
                MessageBox.warning(_this.getTextFor("GeneralTextFirstCoursesNotChoosen", []));
                return;
            }

            if(!_this._academicSecondChoice){
                Fragment.load({
                    name: "applicationform.fragment.academic.SecondCourseChoice",
                    controller: _this,
                    id: "idSecondCourseDialog"
                }).then(function (_dialog) {
                    _this._academicSecondChoice = _dialog
                    _this.getView().addDependent(_this._academicSecondChoice);
                    _this._academicSecondChoice.open();
                }.bind(_this));
            }else{
                _this._academicSecondChoice.open();
            }

            _this._filterTableByInternship("idSecondCourseDialog", "secondChoiceCourseTable");

        },

        
		onSecondCourseChoiceCheckBoxSelect: function(oEvent) {
            const _this = this;
            const selectedCourse = oEvent.getSource().getBindingContext("CourseList").getObject();
            const allCourses = _this.getModel("CourseList").getData();
            const allConstraint = _this.getModel("CourseConstraintList").getData();
            const selected = selectedCourse.isSecondSelected;

            const constraints = allConstraint.results.filter(item => item.course_ID === selectedCourse.course_ID || item.courseBlockedBy_ID === selectedCourse.course_ID);
            if(constraints != null && constraints.length > 0){
                constraints.forEach(item => {
                    allCourses.results.map(course => {
                        if(course.course_ID !== selectedCourse.course_ID && (course.course_ID === item.course_ID || course.course_ID === item.courseBlockedBy_ID)){
                            course.isConstrained = selected;
                        }
                        return course;
                    })
                })
                _this.setModel(new JSONModel(allCourses), "CourseList");
            }
		},
        
		onSecondCourseChoiceConfirm: function(oEvent) {
			const _this = this;
            const allCourses = _this.getModel("CourseList").getData();
            allCourses.results.map(item => {
                if(item.isSecondSelected){
                    item.isSecondConfirmed = true;
                }else{
                    item.isSecondConfirmed = false;
                }
            });
            _this.setModel(new JSONModel(allCourses), "CourseList");
            _this.onDialogSecondCourseChoiceClose();
		},
        
		onDialogSecondCourseChoiceClose: function(oEvent) {
            const _this = this;
            if(_this._academicSecondChoice){
                _this._academicSecondChoice.close();
                _this._academicSecondChoice.destroy();
                _this._academicSecondChoice = null;
            }
		},

        onDropFirstCourseTable: function(oEvent) {
            const _this = this;
            var oDraggedParameter = oEvent.getParameter("draggedControl");
			var oDraggedItem = oDraggedParameter.getBindingContext("CourseList").getObject();
			if (!oDraggedItem) {
				return;
			}

			var oDroppedItem = oEvent.getParameter("droppedControl");

			if (oDroppedItem instanceof ColumnListItem) {
				// get the dropped row data
				var oDropped = oDroppedItem.getBindingContext("CourseList").getObject();
				const courseList = _this.getModel("CourseList").getData();
                courseList.results.map(item => {
                    if(item.course_ID === oDraggedItem.course_ID){
                        item.firstRank = oDropped.firstRank;
                    }

                    if(item.course_ID === oDropped.course_ID){
                        item.firstRank = oDropped.firstRank;
                    }
                })

                _this.setModel(new JSONModel(courseList), "CourseList");

			}

		},

        onDropSecondCourseTable: function(oEvent) {
            const _this = this;
            var oDraggedParameter = oEvent.getParameter("draggedControl");
			var oDraggedItem = oDraggedParameter.getBindingContext("CourseList").getObject();
			if (!oDraggedItem) {
				return;
			}

			var oDroppedItem = oEvent.getParameter("droppedControl");

			if (oDroppedItem instanceof ColumnListItem) {
				// get the dropped row data
				var oDropped = oDroppedItem.getBindingContext("CourseList").getObject();
				const courseList = _this.getModel("CourseList").getData();
                courseList.results.map(item => {
                    if(item.course_ID === oDraggedItem.course_ID){
                        item.secondRank = oDropped.secondRank;
                    }

                    if(item.course_ID === oDropped.course_ID){
                        item.secondRank = oDropped.secondRank;
                    }
                })

                _this.setModel(new JSONModel(courseList), "CourseList");

			}

		},

		onSearchSecondCourseName: function(oEvent) {
            var sQuery = oEvent.getParameter("query").toUpperCase();
            const oTable = sap.ui.core.Fragment.byId("idSecondCourseDialog", "secondChoiceCourseTable");
            const oFilter = new Filter("courseName", FilterOperator.Contains, sQuery);
            const oBinding = oTable.getBinding("items");
            oBinding.filter([oFilter, new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse())]);
		},

		onFilterSecondCourseCredit: function(oEvent) {
            let selectedValue = oEvent.getSource().getSelectedItem();
            const oTable = sap.ui.core.Fragment.byId("idSecondCourseDialog", "secondChoiceCourseTable");
            const oBinding = oTable.getBinding("items");

            if(selectedValue.getText()===""){
                oBinding.filter([new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse())]);
            }else{
                const oFilter = new Filter("courseCredit", FilterOperator.EQ, selectedValue.getText());
                oBinding.filter([oFilter, new Filter("courseInternship", FilterOperator.EQ, this._canSeeInternshipCourse())]);
            }
		},

        
		onSecondCourseDeleteButtonPress: function(oEvent) {
			const _this = this;
            const selectedCourse = oEvent.getSource().getBindingContext("CourseList").getObject();
            const allCourses = _this.getModel("CourseList").getData();
            allCourses.results.map(item => { 
                if(item.course_ID === selectedCourse.course_ID) {
                    item.isSecondSelected=false;
                    item.isSecondConfirmed=false;
                } 
            });
            _this.setModel(new JSONModel(allCourses), "CourseList");
		},
        
		onUploadLearningImpairment: function(oEvent) {
			const _this = this;
            _this.oLearningImpairmentFile = oEvent.getSource().oFileUpload.files[0];
		},

		onFirstCourseDeleteButtonPress: function(oEvent) {
			const _this = this;
            const selectedCourse = oEvent.getSource().getBindingContext("CourseList").getObject();
            const allCourses = _this.getModel("CourseList").getData();
            allCourses.results.map(item => { 
                if(item.course_ID === selectedCourse.course_ID) {
                    item.isFirstSelected=false;
                    item.isFirstConfirmed=false;
                } 
            });
            _this.setModel(new JSONModel(allCourses), "CourseList");
		},

        _checkAcademicRequired : function() {
            const _this = this;
            const academicInfo = _this.getModel("AcademicInfo").getData();
            const allCourses = _this.getModel("CourseList").getData();
            const notMandatory = _this.getModel("AcademicInfoNotMandatory").getData();

            if(!_this._checkAllObjectKey(academicInfo) || (academicInfo.learningImpairments && !notMandatory.noteLearningImpairments)){
                return false;
            }

            var choosedFirstCourses = false;

            allCourses.results.forEach(item => {
                if(item.isFirstConfirmed){
                    choosedFirstCourses = true;
                }
            })

            return choosedFirstCourses;
        },

        onGpaInputChange: function(oEvent) {
			const _this = this;
            const REGEX_GPA = /^\d+(\.\d+)?$/;
            const value = oEvent.getParameters().value;
            const floatValue = parseFloat(value);
            if(floatValue <= 2.5){
                MessageBox.warning(_this.getTextFor("AcademicGPANotEnough", []));
            }
            if(REGEX_GPA.test(value)===false){
                MessageBox.warning(_this.getTextFor("AcademicInfoGPAErrorMsg", []));
            }
            const academicInfo = _this.getModel("AcademicInfo").getData();
            academicInfo.gpa = floatValue
		},

        onDialogFirstCourseAfterOpen : function(oEvent){
            this._filterTableByInternship("idFirstCourseDialog", "firstChoiceCourseTable");
        },

        onDialogSecondCourseOpen : function(oEvent){
            this._filterTableByInternship("idSecondCourseDialog", "secondChoiceCourseTable");
        },

        //-----------------Academic information endss--------------------------


        //-----------------Internship starts---------------------------

        _getInternship : function(){
            const _this = this;
            const academicInfo = _this.getModel("AcademicInfo").getData();
            const courseList = _this.getModel("CourseList").getData();

            var internshipCourse = false;

            courseList.results.forEach(item => {
                if(item.isFirstConfirmed && (item.courseInternship)){
                    internshipCourse = true;
                }
            })
            if(academicInfo && academicInfo.internshipAvailable && academicInfo.gpa >= 3 && academicInfo.internshipAvailable && internshipCourse){
                return true;
            }

            return false;
        },

        JModelSetupInternship: function() {
            const _this = this;

            _this.getModel("ApplicationFormInfo").setProperty("/busy", true);

            const internshipInfo = {
                relevantCoursework : null,
            };

            _this.setModel(new JSONModel(internshipInfo), "InternshipInfo");
            _this.setModel(new JSONModel({}), "InternshipInfoNotMandatory")

            _this.oDataGET(_this, "/ItalianLanguageProficiency", "ItalianLanguageProficiencyList", "","","ItalianLanguageProficiencyList").finally(() => {
                _this.getModel("ApplicationFormInfo").setProperty("/busy", false);
            });

		},

        onChooseLanguageProficiency : function(oEvent){
            this.setPropertyBySelectKey("InternshipInfoNotMandatory", "/italianLanguageProficiency_ID", oEvent);
        },

        _checkInternalshipRequired : function(){

            const _this = this;
            const internshipInfo = _this.getModel("InternshipInfo").getData();
            if(!_this._checkAllObjectKey(internshipInfo)){
                return false;
            }

            return true;
        },

        //-----------------Internship ends--------------------------

        //-----------------Health and safety start-----------------------

        JModelSetupHealth : function(){
            const _this = this;
            
            _this.getModel("ApplicationFormInfo").setProperty("/busy", true);

            if(!_this.getModel("ApplicationFormInfo").getData().loadHealth){
                const healthInfo = {
                    foodAllergie_ID : null,
                    otherAllergie_ID : null,
                    medCond_ID : null
                };

                _this.setModel(new JSONModel({noteDietaryOther:false, foodAllergieYes:false, otherAllergieYes:false, medicalConditionYes:false}), "HealthInfoNotMandatory");
    
                _this.setModel(new JSONModel(healthInfo), "HealthInfo");
    
                _this.loadHealthData();
            }

        },

        loadHealthData : function(){
            const _this = this;
            const promises = [_this.oDataGET(_this, "/DietaryPreference", "DietaryPreferenceList", "","", "DietaryPreferenceList").then((data) => {
                data.results.push({preference:"other", isOther:true});
                _this.setModel(new JSONModel(data), "DietaryPreferenceList");
            }),
            _this.oDataGET(_this, "/FoodAllergie", "FoodAllergieList", "", "","FoodAllergieList"),
            _this.oDataGET(_this, "/OtherAllergie", "OtherAllergieList", "", "", "OtherAllergieList"),
            _this.oDataGET(_this, "/MedicalCondition", "MedicalConditionList", "", "", "MedicalConditionList")];
            Promise.all(promises).then().catch((err) => console.log(err)).finally(() => {
                _this.getModel("ApplicationFormInfo").setProperty("/busy", false);
            })
        },

        onChooseFoodAllergies : function(oEvent){
            const _this = this;
            _this.setPropertyBySelectKey("HealthInfo", "/foodAllergie_ID", oEvent);
            if(oEvent.getSource().getSelectedItem().getText().toLowerCase().includes("yes")){
                _this.getModel("HealthInfoNotMandatory").setProperty("/foodAllergieYes", true);
            }else{
                _this.getModel("HealthInfoNotMandatory").setProperty("/foodAllergieYes", false);
            }
        },

        onChooseOtherAllergies : function(oEvent){
            const _this = this;
            _this.setPropertyBySelectKey("HealthInfo", "/medCond_ID", oEvent);
            if(oEvent.getSource().getSelectedItem().getText().toLowerCase().includes("yes")){
                _this.getModel("HealthInfoNotMandatory").setProperty("/otherAllergieYes", true);
            }else{
                _this.getModel("HealthInfoNotMandatory").setProperty("/otherAllergieYes", false);
            }
        },

        onChooseHealthImpairments : function(oEvent){
            const _this = this;
            _this.setPropertyBySelectKey("HealthInfo", "/foodAllergie_ID", oEvent);
            if(oEvent.getSource().getSelectedItem().getText().toLowerCase().includes("yes")){
                _this.getModel("HealthInfoNotMandatory").setProperty("/medicalConditionYes", true);
            }else{
                _this.getModel("HealthInfoNotMandatory").setProperty("/medicalConditionYes", false);
            }
        },

        onSelectDietaryPreferencesButtonPress : function(){
            const _this = this;

            if(!_this._chooseDietaryDialog){
                Fragment.load({
                    name: "applicationform.fragment.health.ChooseDietary",
                    controller: _this,
                    id: "idChooseDietaryDialog"
                }).then(function (_dialog) {
                    _this._chooseDietaryDialog = _dialog
                    _this.getView().addDependent(_this._chooseDietaryDialog);
                    _this._chooseDietaryDialog.open();
                }.bind(_this));
            }else{
                _this._chooseDietaryDialog.open();
            }
        },

        onChooseDietarySelectConfirm : function(oEvent){
            const _this = this;
            const selectedDietaries = _this.retrieveSelectedContexts(oEvent);
            const dietaries = [];
            let isOther = false;
            let choosedValues = "";
            if(selectedDietaries){
                selectedDietaries.forEach(item => {
                    dietaries.push(item);
                    if(item.isOther){
                        isOther = true;
                    }
                    choosedValues += " " + item.preference;
                });
            }
            _this.setModel(new JSONModel({dietaries : dietaries, choosedValues : choosedValues}), "SelectedDietaries");
            _this.getModel("HealthInfoNotMandatory").setProperty("/noteDietaryOther", isOther);
        },

        //-----------------Health and safety ends -------------------------------
        //-----------------shared --------------------
        onGeneralSelectDialogSearch : function(oEvent){
            const _this = this;
            _this.generalSelectDialogSearchManage(_this, oEvent, ["name"]);
        },

        onGeneralSelectDialogCancel: function (oEvent) {
            const _this = this;
            _this.manageSelectDialogCancel(oEvent);
        },


        setPropertyBySelectKey : function(jModel, field, oEvent){
            const _this = this;
            let selectedValue = oEvent.getSource().getSelectedItem();
            _this.getModel(jModel).setProperty(field, selectedValue.getKey());
        },
        
        onGeneralCheckBoxNoPress : function(value, Jmodel){
            const _this = this;
            const pInfo = _this.getModel(Jmodel);
            if(pInfo.getData()[value]){
                _this.getModel(Jmodel).setProperty("/" + value, false);
            }else{
                _this.getModel(Jmodel).setProperty("/" + value, true);
            }

        },

        onGeneralSearchDialog : function(oEvent){
            const _this = this;
            _this.generalSelectDialogSearchManage(_this, oEvent, ["courseName"]);
        },

    });

});
