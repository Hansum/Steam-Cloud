var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var expressValidator = require("express-validator");
var chart = require("chartjs");
var mysql = require("mysql");
var flash = require('connect-flash');
var cookieParser = require('cookie-parser');
var session = require("express-session");
var nodemailer = require("nodemailer");
var validator = require("email-validator");
var pdf = require("pdfkit");
var fs = require("fs");
var http = require("http");
var fileUpload = require('express-fileupload');
var crypto = require('crypto'), algorithm = 'aes-256-ctr';

function encrypt(text,token){
  var cipher = crypto.createCipher(algorithm,token)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text,token){
  var decipher = crypto.createDecipher(algorithm,token)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

var db = mysql.createConnection({
	host:'localhost',
	user:'root',
	password:'',
	database:'steamclouddb',
	multipleStatements: true
});
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'chedph01@gmail.com',
    pass: 'chedadmin1'
  }
});

db.connect((err) => {
	if(err){
		console.log("Database connection error");
	}else{
		console.log("Database connection successful");
	}
});

var app = express();

app.use(fileUpload());
app.use(cookieParser('secret'));
app.use(session({secret:'CHEdSystem', cookie:{maxAge:60000000}}));
app.use(flash());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.use(express.static(path.join(__dirname, "public")));

app.use(expressValidator({
	errorFormatter: function(param, msg, value){
		var namespace = param.split('.')
		, root = namespace.shift()
		, formParam = root;

		while(namespace.length){
			formParam += "[" + namespace.shift() + "]";
		}
		return{
			param: formParam,
			msg	 : msg,
			value: value
		};
	}
}));

app.get("/", function(req, res){
	if(req.session.userId > -1 && req.session.accessLevel != null){

		switch(req.session.accessLevel){
			case '1': res.redirect("/admin"); break;
			case '2': res.redirect("/director"); break;
			case '3': res.redirect("/dean"); break;
			case '4': res.redirect("/deptchair"); break;
			case '5': res.redirect("/faculty"); break;
			default: res.redirect(404, "/"); break;
		}
			
		
	}else if(req.session.accessLevel == null && req.session.userId == 1){
		res.redirect("/ched");
	}else{
		res.render("index", { error: "0" });
	}
	
});

app.get("/logout",function(req,res){
	req.session.userId = null;
		res.render("index", { error: "0" });
});

app.post("/login", function(req, res){
	var email = req.body.email;
	var pwd = req.body.pwd;

	var chedsql = "SELECT adminId FROM ched WHERE email = '" + email + "' AND password = '" + pwd +"'";

	db.query(chedsql, (err, result) => {
		if(err || result[0] == null){

			var sql = "SELECT facultyId, institutionId, schoolId, departmentId, accessLevel, verificationLevel FROM faculty WHERE email = '" + email + "'";

			db.query(sql, (err, result) => {
				var sqlpass = 'SELECT password, token FROM faculty WHERE email="'+email+'"';
				if(err || result[0] == null){
					console.log("Email does not exist. User cannot login.");
					res.render("index", { error : "1" });
				}else{
					db.query(sqlpass, (err, passw) =>{
						var decryptpass = decrypt(passw[0].password,passw[0].token);
						if(err || decryptpass != pwd){
							console.log("Invalid Password. User cannot login.");
							res.render("index", { error : "2" });
						}else{
							req.session.userId = result[0].facultyId;
							req.session.depId = result[0].departmentId;
							req.session.schoolId = result[0].schoolId;
							req.session.institutionId = result[0].institutionId;
							req.session.accessLevel = result[0].accessLevel;

							if(result[0].verificationLevel <= 3){
								switch(result[0].accessLevel){
									case '1': res.redirect("/admin"); break;
									case '2': res.redirect("/director"); break;
									case '3': res.redirect("/dean"); break;
									case '4': res.redirect("/deptchair"); break;
									case '5': res.redirect("/faculty"); break;
									default: res.redirect(404, "/"); break;
								}
								console.log("Log in successful");
							}else if(result[0].verificationLevel == 4){
								res.render("schoolDeanVerification");
							}else if(result[0].verificationLevel == 5){
								res.render("deptChairVerification");
							}else{
								console.log("Log in error");
							}
						}
					});
					
				}
			});

		}else{
			req.session.userId = result[0].adminId;
			console.log(req.session.userId);

			req.session.accessLevel = null;
			console.log(req.session.accessLevel);

			console.log("Ched log in successful");
			res.redirect("/ched");
		}
	});

});


app.get("/ched", function(req, res){
	var fault = req.query.fault;
	switch(fault){
		case '1':req.flash('fail','School name already exists!');
				res.locals.message = req.flash();break;
		case '2':req.flash('fail','Department name already exists!');
				res.locals.message = req.flash();break;
		case '3':req.flash('fail','Program name already exists!');
				res.locals.message = req.flash();break;
		case '4':req.flash('fail','The email is not valid!');
				res.locals.message = req.flash();break;
		case '5':req.flash('fail','Institution name already exists!');
				res.locals.message = req.flash();break;
		case '6':req.flash('fail','Region name already exists!');
				res.locals.message = req.flash();break;
		default: res.locals.message= "Success";break;
	}

	if(req.session.userId != null && req.session.accessLevel == null){
		var sql = "SELECT institutionId, institutionName, address FROM institution";

		db.query(sql, (err, result) => {
				var countInstitution = "SELECT COUNT(institutionId) AS institutionNumber FROM institution";
			if(err){
				console.log("Institution id and name retrieval error");
			}else{

				db.query(countInstitution, (err,institutioncount) => {
						var countSchool = "SELECT COUNT(schoolId) as schoolNumber FROM school";
					if (err) {
						console.log("Institution count error");
					} else {
						console.log("Institution count success");

						db.query(countSchool, (err,schoolcount) => {
								var countDepartment = "SELECT COUNT(departmentId) as departmentNumber FROM department";
							if (err) {
								console.log("School count error");
							} else {
								console.log("School count success");

								db.query(countDepartment, (err,departmentcount) =>{
										var countFaculty = "SELECT COUNT(facultyId) as facultyNumber FROM faculty";
									if (err) {
										console.log("Department count error");
									} else {
										console.log("Department count success");

										db.query(countFaculty, (err,facultycount) => {
												var countprogram = "SELECT COUNT(programId) as programNumber FROM program";
											if (err) {
												console.log("Faculty count error");
											} else {
												console.log("Faculty count success");

												db.query(countprogram, (err,programcount) => {
													var uniquefaculty = "SELECT facultyId, fname, lname, email, position, accessLevel, verificationLevel, faculty.institutionId AS institutionId, institutionName FROM faculty JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.accessLevel = '5'";
													if (err) {
														console.log("Program count error");
													} else {
														console.log("Program count success");

														db.query(uniquefaculty, (err,faculty) => {
															var alladmin = "SELECT * FROM faculty WHERE accessLevel = '1'";
															if(err){
																console.log("Faculty find error.");
															}else{
																console.log("Faculty find success.");

																db.query(alladmin,(err,alladmin) => {
																	var region = "SELECT COUNT(institutionId) as InstitutionRegion, region.regionName AS region FROM institution JOIN region ON institution.region_id = region.region_id GROUP BY institution.region_id";
																	if(err){
																		console.log('Admin Find error.');
																	}else{
																		console.log("Admin Find success.");

																		db.query(region, (err, institutionregion) => {
																			var facultyaccesslevel = "SELECT COUNT(facultyId) as FacultyLevel, position FROM faculty GROUP BY accessLevel";
																			if(err){
																				console.log("Region retrieval error");
																			}else{
																				console.log("Region retrieval success");

																				db.query(facultyaccesslevel, (err,facultylevel) => {
																					var facgender = "SELECT COUNT(facultyId) as FacultyGender, gender FROM faculty GROUP BY gender";
																					if (err) {
																						console.log("Faculty level retrieval error");
																					} else {
																						console.log("Faculty level retrieval success");

																						db.query(facgender, (err,facultygender) =>{
																							var facage = "SELECT COUNT(dateOfBirth) AS FacultyAge, YEAR(NOW())- YEAR(dateOfBirth) AS AGE FROM faculty GROUP BY age";
																							if (err) {
																								console.log("Gender Retrival error");
																							} else {
																								console.log("Gender retrieval success");

																								db.query(facage, (err,facultyage) => {
																									var facultyspecial = "SELECT COUNT(facultyId) as FacultySpecialization, specialization FROM faculty GROUP BY specialization";
																									if(err){
																										console.log("Age retrieval error");
																									}else{
																										console.log("Age retrieval success");

																										db.query(facultyspecial, (err,specialization) => {
																											var facultygraduate = "SELECT COUNT(facultyId) as FacultyGraduate, schoolGraduated FROM faculty GROUP BY schoolGraduated";
																											if(err){
																												console.log("Faculty Specialization retrieval error");
																											}else{
																												console.log("Faculty Specialization retrieval success");

																												db.query(facultygraduate, (err, facultyschoolgraduate) =>{
																													var facultyeducation = "SELECT COUNT(facultyId) as FacultyDegree, educationalAttainment FROM faculty GROUP BY educationalAttainment";
																													if(err){
																														console.log("School Graduted retrieval error");
																													}else{
																														console.log("School Graduted retrieval success");

																														db.query(facultyeducation, (err,degree) => {

																															var enrollee = 'SELECT SUM(population) as enrollees, year FROM programdata GROUP BY year';
																															if(err){
																																console.log("Degree retrieval success");
																															}else{
																																console.log("Degree retrieval success");

																																db.query(enrollee, (err,studentenrollee) => {
																																	var cod = "SELECT DISTINCT institution_department.departmentId, departmentName, institutionName, region.regionName AS region, institution_department.institutionId FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution ON institution_department.institutionId = institution.institutionId JOIN region ON institution.region_id = region.region_id WHERE centerOfExcellence IS null AND centerOfDevelopment IS null ORDER BY institution.institutionId";
																																	if(err){
																																		console.log("Enrollee and Graduate retrieval error");
																																	}else{
																																		console.log("Enrollee and Graduate retrieval success");

																																		db.query(cod, (err, cod) => {
																																			var coe = "SELECT institution_department.departmentId, departmentName, institutionName, region.regionName AS region, institution_department.institutionId FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution ON institution_department.institutionId = institution.institutionId JOIN region ON institution.region_id = region.region_id WHERE centerOfDevelopment = 'Certified' AND centerOfExcellence IS null ORDER BY institution.institutionId";
																																			if(err){
																																				console.log("Uncertified departments data not available.")
																																			}else{
																																				console.log("Found department data.");

																																			db.query(coe, (err, coe) =>{
																																				var delc = "SELECT institution_department.departmentId, departmentName, institutionName, region.regionName AS region, institution_department.institutionId, centerOfDevelopment, centerOfExcellence FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution ON institution_department.institutionId = institution.institutionId JOIN region ON institution.region_id = region.region_id WHERE centerOfDevelopment = 'Certified' OR centerOfExcellence = 'Certified' ORDER BY institution.institutionId"
																																				if(err){
																																					console.log("Center of Development departments error.");
																																				}else{
																																					console.log("Center of Development data success.");

																																					db.query(delc, (err, delc)=> {
																																						var facultyaverage = 'SELECT AVG(facaverage) as facavg, institutionName FROM (SELECT COUNT(facultyId) AS facaverage, institutionName FROM faculty JOIN institution ON faculty.institutionId = institution.institutionId GROUP BY institutionName ) AS sample GROUP BY institutionName';
																																						if(err){
																																							console.log("Delete information failure.");
																																						}else{
																																							console.log("Delete information success.");

																																							db.query(facultyaverage, (err,averagefaculty)=> {

																																								var schoolave  = 'SELECT AVG(schoolInstitution) as avgschool, institutionName FROM (SELECT COUNT(institution_school.schoolId) AS schoolInstitution, institutionName FROM institution_school JOIN institution ON institution_school.institutionId = institution.institutionId GROUP BY institutionName ) AS sample GROUP BY institutionName';
																																								if(err){
																																									console.log("Faculty average per institution error");
																																								}else{
																																									console.log("Faculty average per institution success");

																																									db.query(schoolave, (err,aveschool) => {

																																										var certify = 'SELECT COUNT(centerOfExcellence) as centerOfExcellence, COUNT(centerOfDevelopment) as centerOfDevelopment FROM institution_department';
																																											if(err){
																																												console.log("Average school retrieval error")
																																											}else{
																																												console.log("Average school retrieval success");

																																												db.query(certify, (err,certification) =>{
																																													var deptInst = 'SELECT AVG(depave) as avedeptint, institutionName FROM (SELECT COUNT(institution_department.departmentId) AS depave, institutionName FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId JOIN institution ON institution_department.institutionId = institution.institutionId GROUP BY institutionName ) AS sample';
																																													if(err){
																																														console.log("Certification retrieval error");
																																													}else{
																																														console.log("Certification retrieval success");

																																														db.query(deptInst, (err, avedepartment) => {

																																															var deptsch = 'SELECT AVG(depavesc) as avedeptsch, schoolName FROM (SELECT COUNT(institution_department.departmentId) AS depavesc, schoolName FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId JOIN institution_school ON institution_department.schoolId = institution_school.schoolId JOIN school ON institution_school.schoolId = school.schoolId GROUP BY schoolName ) AS sample';
																																															
																																															if(err){
																																																console.log("Average department per institution retrieval error");
																																															}else{
																																																console.log("Average department per institution retrieval success");

																																																db.query(deptsch, (err,avedeptschool) => {
																																																	var institutionlist = 'SELECT DISTINCT institutionId, institutionName, region.regionName AS region FROM institution JOIN region ON region.region_id = institution.region_id ORDER BY institution.region_id ASC';
																																																	if(err){
																																																		console.log("Average department per school retrieval error");
																																																	}else{
																																																		console.log("Average department per school retrieval success");

																																																		db.query(institutionlist, (err,listinstitute) => {
																																																			var instidataadmin = 'SELECT institution.institutionId,institutionName,address,fname,lname FROM faculty LEFT JOIN institution ON faculty.institutionId = institution.institutionId WHERE accessLevel = "1"';
																																																			if(err){
																																																				console.log("List of institutions retrieval error");
																																																			}else{
																																																				console.log("List of instituttions retrieval success");

																																																				db.query(instidataadmin, (err,institutiondata) =>{
																																																					var instidatadirector = 'SELECT fname,lname FROM faculty LEFT JOIN institution ON institution.institutionId = faculty.institutionId WHERE accessLevel = "2"';
																																																					if(err){
																																																						console.log("Institution data retrieval error");
																																																					}else{
																																																						console.log("Institution data retrieval success");

																																																						db.query(instidatadirector, (err,directorinstidata) => {
																																																							var schoolTables = 'SELECT institution.institutionName AS institutionName, faculty.fname AS fname, faculty.lname AS lname, school.schoolName AS schoolName FROM faculty JOIN institution_school ON faculty.facultyId = institution_school.deanId JOIN school ON institution_school.schoolId = school.schoolId JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.accessLevel = "3" ORDER BY institutionName ASC';
																																																							if(err){
																																																								console.log("Institution director name retrieval data error");
																																																							}else{
																																																								console.log("Institution director name retrieval data success");

																																																								db.query(schoolTables, (err, schoolTables) => {

																																																									var deptables = 'SELECT DISTINCT institution_department.departmentId, departmentName, schoolName, institutionName, fname, lname, centerOfDevelopment, centerOfExcellence FROM faculty JOIN institution_department ON faculty.facultyId = institution_department.chairmanId JOIN department ON institution_department.departmentId = department.departmentId JOIN school ON faculty.schoolId = school.schoolId LEFT JOIN institution ON faculty.institutionId = institution.institutionId ';
																																																									if(err){
																																																										console.log("School data tables not found.");
																																																									}else{
																																																										console.log("School data tables found.");

																																																										db.query(deptables, (err,departmenttables) => {
																																																											var regaverage = 'SELECT AVG(regavg) as regionavg,region FROM (SELECT COUNT(institutionId) as regavg, institutionName, region.regionName AS region FROM institution JOIN region ON institution.region_id = region.region_id GROUP BY institution.region_id) as sample';
																																																											if(err){
																																																												console.log("Department data tables error");
																																																											}else{
																																																												console.log("Department data tables success");

																																																												db.query(regaverage, (err,averageregion) => {
																																																													var chedfaclist = 'SELECT faculty.facultyId as facultyId,institutionName, schoolName, fname, lname,position,email,educationalAttainment,schoolGraduated,gender,DATE_FORMAT(dateHired,"%M %d %Y") as dateHired,facultyType,specialization,yearGraduated FROM faculty LEFT JOIN school ON faculty.schoolId = school.schoolId LEFT JOIN institution ON faculty.institutionId = institution.institutionId ORDER BY institutionName ASC';
																																																													if(err){
																																																														console.log("Average region retrieval error");
																																																													}else{
																																																														console.log("Average region retrieval success");

																																																														db.query(chedfaclist, (err,chedfactables) => {
																																																															var allSchool = 'SELECT * FROM school';
																																																															if(err){
																																																																console.log("faculty data tables retrieval error");
																																																															}else{
																																																																console.log("faculty data tables retrieval success");

																																																																db.query(allSchool, (err, allSchool) => {
																																																																	var allDept = 'SELECT * FROM department';
																																																																	if(err){
																																																																		console.log("Error in finding schools.");
																																																																	}else{
																																																																		console.log("Retrieved all schools.");

																																																																		db.query(allDept, (err, allDept) => {
																																																																		var allProgram = 'SELECT * FROM program';
																																																																			if(err){
																																																																				console.log("Error in finding departments.");
																																																																			}else{
																																																																				console.log("Retrieved all departments.");

																																																																				db.query(allProgram, (err, allProgram) => {
																																																																					var studentPerSchool= 'SELECT AVG(enrollNum) AS enrollAve, schoolName FROM (SELECT SUM(programdata.population) AS enrollNum, schoolName FROM programdata JOIN school ON programdata.schoolId = school.schoolId GROUP BY schoolName, year) AS sample GROUP BY schoolName';
																																																																					if(err){
																																																																						console.log("Error in finding programs.");
																																																																					}else{
																																																																						console.log("Retrieved all programs.");

																																																																						db.query(studentPerSchool, (err, studentPerSchool) => {
																																																																							var popuLine = 'SELECT institution.institutionId as institutionId, institutionName, population, year FROM programdata JOIN institution ON programdata.institutionId = institution.institutionId';																																																																							
																																																																							if(err){
																																																																							console.log("Error in finding average student each year per school.");
																																																																							}else{
																																																																							console.log("Success in finding average student each year per school.");

																																																																							db.query(popuLine,(err,linePopulation) =>{
																																																																								var instidistinct = 'SELECT DISTINCT institution.institutionId FROM institution';
																																																																								if(err){
																																																																									console.log("Population Line chart error");
																																																																								}else{
																																																																									console.log("Population Line chart success");

																																																																									db.query(instidistinct,(err,distinctinstitution)=>{
																																																																										var schoolgrp = 'SELECT COUNT(sId) as numschool, schoolName FROM (SELECT institution_school.schoolId as sId,schoolName FROM institution_school JOIN school ON institution_school.schoolId = school.schoolId) as schooNum GROUP BY schoolName';
																																																																										if(err){
																																																																											console.log("distinct institution success");
																																																																										}else{
																																																																											console.log("Faculty count in ched success");

																																																																											db.query(schoolgrp,(err,grpschool)=>{
																																																																												var departmentgrp = 'SELECT COUNT(dId) as numdepartment, departmentName FROM (SELECT institution_department.schoolId as dId,departmentName FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId) as depNum GROUP BY departmentName';
																																																																												if(err){
																																																																													console.log("group of school error");
																																																																												}else{
																																																																													console.log("group of school success");

																																																																													db.query(departmentgrp,(err,grpdepartment)=>{
																																																																														var facggroupage = 'SELECT SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 20 AND 30 THEN 1 ELSE 0 END) AS "twentyTothirty", SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 30 AND 40 THEN 1 ELSE 0 END) AS "thirtyToforty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 40 AND 50 THEN 1 ELSE 0 END) AS "fortyTofifty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 50 AND 60 THEN 1 ELSE 0 END) AS "fiftyTosixty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 60 AND 70 THEN 1 ELSE 0 END) AS "sixtyToseventy",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 70 AND 80 THEN 1 ELSE 0 END) AS "seventyToeighty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 80 AND 90 THEN 1 ELSE 0 END) AS "eightyToninety" FROM faculty';
																																																																														if(err){
																																																																															console.log("deparment grp error");
																																																																														}else{
																																																																															console.log("department grp success");

																																																																															db.query(facggroupage,(err,agerange)=>{
																																																																																var facbook = 'SELECT DISTINCT faculty.facultyId, fname, lname, mname, position, educationalAttainment, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM faculty  LEFT JOIN faculty_book on faculty_book.facultyId = faculty.facultyId LEFT JOIN book on book.bookId = faculty_book.bookId';
																																																																																if(err){
																																																																																	console.log('faculty age range error');
																																																																																}else{
																																																																																	console.log('faculty age range success');

																																																																																	db.query(facbook,(err,bookfac)=>{
																																																																																		var facjournal = 'SELECT DISTINCT faculty.facultyId, journal.title as journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume as journalVolume, journal.journalVerificationLevel FROM faculty  LEFT JOIN faculty_journal on faculty_journal.facultyId = faculty.facultyId LEFT JOIN journal on journal.journalId = faculty_journal.journalId';
																																																																																		if(err){
																																																																																			console.log("Faculty book error");
																																																																																		}else{
																																																																																			console.log("Faculty book success");

																																																																																			db.query(facjournal,(err,journalfac)=>{
																																																																																				var facresearch ='SELECT DISTINCT faculty.facultyId, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description as researchDescriptions, research.coresearchers, research.researchVerificationLevel FROM faculty  LEFT JOIN faculty_research on faculty_research.facultyId = faculty.facultyId LEFT JOIN research on research.researchId = faculty_research.researchId';
																																																																																				if(err){
																																																																																					console.log("Faculty journal error");
																																																																																				}else{
																																																																																					console.log("Faculty journal success");

																																																																																					db.query(facresearch,(err,researchfac)=>{
																																																																																						var programsum = 'SELECT SUM(population) AS sumpop, programName FROM programdata JOIN program ON programdata.programId = program.programId GROUP BY programName'
																																																																																						if(err){
																																																																																							console.log("Faculty research error");
																																																																																						}else{
																																																																																							console.log("Faculty research success");
																																																																																							db.query(programsum, (err, programsum) =>{
																																																																																								var progoffered = 'SELECT COUNT(ava) AS cava, year FROM (SELECT availability AS ava, year FROM programdata) AS ana WHERE ava = "Offered" GROUP BY year';
																																																																																							if(err){
																																																																																								console.log("Program data sum error.");
																																																																																							}else{

																																																																																								console.log("Program data sum success.");

																																																																																									db.query(progoffered,(err,programoffered)=>{
																																																																																									var prognotoffered = 'SELECT COUNT(ava) AS notava, year FROM (SELECT availability AS ava, year FROM programdata) AS ana WHERE ava = "Not Offered" GROUP BY year';
																																																																																										if(err){
																																																																																											console.log("Program offered error");
																																																																																										}else{
																																																																																											console.log("Program offered success");

																																																																																											db.query(prognotoffered,(err,programnotoffered)=>{
																																																																																												var programtablesql = 'SELECT institution.institutionName, program.programName, programdata.year, programdata.availability,programdata.population FROM programdata JOIN institution ON programdata.institutionId = institution.institutionId JOIN program ON programdata.programId = program.programId ORDER BY year ASC';
																																																																																												if(err){
																																																																																													console.log("Program Not offered error");
																																																																																												}else{
																																																																																													console.log("Program Not offered success");

																																																																																													db.query(programtablesql,(err, programtablesql) =>{
																																																																																														var pubCount = 'SELECT (SELECT COUNT(bookId) AS bi FROM faculty_book) AS bId, (SELECT COUNT(researchId) FROM faculty_research) AS rId, (SELECT COUNT(journalId) FROM faculty_journal) AS jId, (SELECT COUNT(thesisId) FROM faculty_thesis) AS tId FROM dual';
																																																																																														if(err){
																																																																																															console.log("Program Table Error");
																																																																																														}else{
																																																																																															console.log("Program Table Success");

																																																																																															db.query(pubCount, (err, pubCount)=> {
																																																																																																var facperschool='SELECT COUNT(facnum) as facultyperschool, schoolName FROM (select faculty.facultyId as facnum, schoolName FROM faculty JOIN school ON faculty.schoolId = school.schoolId) as schoolfaculty GROUP BY schoolName';
																																																																																																if(err){
																																																																																																	console.log("All Publications count error.");
																																																																																																}else{
																																																																																																	console.log("All Publications count success.");

																																																																																																	db.query(facperschool,(err,schoolfaculties)=>{
																																																																																																		var category = 'SELECT book.category, COUNT(book.bookId) AS number FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE bookVerificationLevel =1 AND denyStatus =0  GROUP by book.category'
																																																																																																		if(err){
																																																																																																			console.log("Faculty per school error");
																																																																																																		}else{
																																																																																																			db.query(category, (err,category) => {
																																																																																																				var journalcategory = 'SELECT journal.category, COUNT(journal.journalId) AS number FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE journalVerificationLevel =1 AND journalDenyStatus =0 GROUP by journal.category';
																																																																																																				if(err){
																																																																																																					console.log("book category not found");
																																																																																																				}else{
																																																																																																					db.query(journalcategory, (err,journalcategory) => {
																																																																																																						var researchcategory = 'SELECT research.category, COUNT(research.researchId) AS number FROM research JOIN faculty_research ON faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE researchVerificationLevel =1 AND reserchDenyStatus =0 GROUP by research.category';
																																																																																																						if(err){
																																																																																																							console.log("Pending books not found");
																																																																																																						}else{
																																																																																																							db.query(researchcategory, (err,researchcategory) => {
																																																																																																							var thesiscategory = 'SELECT thesis.topic, COUNT(thesis.topic) AS number FROM thesis JOIN faculty_thesis ON faculty_thesis.thesisId= thesis.thesisId JOIN faculty ON faculty_thesis.facultyId = faculty.facultyId GROUP by thesis.topic';
																																																																																																								if(err){
																																																																																																									console.log("category research not found");
																																																																																																								}else{
																																																																																																									db.query(thesiscategory, (err,thesiscategory) => {
																																																																																																										var yearbook = 'SELECT (SELECT COUNT(bookId) FROM `book` WHERE year BETWEEN 1900 AND 1950 AND bookVerificationLevel =1 AND denyStatus =0) as fifty, (SELECT COUNT(bookId) FROM `book` WHERE year BETWEEN 1951 AND 2000 AND bookVerificationLevel =1 AND denyStatus =0) as twthou, (SELECT COUNT(bookId) FROM `book` WHERE year BETWEEN 2001 AND 2020 AND bookVerificationLevel =1 AND denyStatus =0) as latest from DUAL';
																																																																																																										if(err){
																																																																																																											console.log("Pending books not found");
																																																																																																										}else{
																																																																																																											db.query(yearbook, (err,yearbook) => {
																																																																																																												var yearjournal = 'SELECT (SELECT COUNT(journalId) FROM `journal` WHERE year BETWEEN 1900 AND 1950 AND journalVerificationLevel =1 AND journalDenyStatus =0) as fifty, (SELECT COUNT(journalId) FROM `journal` WHERE year BETWEEN 1951 AND 2000 AND journalVerificationLevel =1 AND journalDenyStatus =0) as twthou, (SELECT COUNT(journalId) FROM `journal` WHERE year BETWEEN 2001 AND 2020 AND journalVerificationLevel =1 AND journalDenyStatus =0) as latest from DUAL';
																																																																																																												if(err){
																																																																																																													console.log("year books not found");
																																																																																																												}else{
																																																																																																													db.query(yearjournal, (err,yearjournal) => {
																																																																																																														var yearresearch = 'SELECT (SELECT COUNT(researchId) FROM `research` WHERE year BETWEEN 1900 AND 1950 AND researchVerificationLevel =1 AND reserchDenyStatus = 0) as fifty, (SELECT COUNT(researchId) FROM `research` WHERE year BETWEEN 1951 AND 2000 AND researchVerificationLevel =1 AND reserchDenyStatus = 0) as twthou, (SELECT COUNT(researchId) FROM `research` WHERE year BETWEEN 2001 AND 2020 AND researchVerificationLevel =1 AND reserchDenyStatus = 0) as latest from DUAL';
																																																																																																														if(err){
																																																																																																															console.log("Pending books not found");
																																																																																																														}else{
																																																																																																															db.query(yearresearch, (err,yearresearch) => {
																																																																																																																var insticert = 'SELECT institution.institutionId,institutionName,COUNT(centerOfDevelopment) as centerOfDevelopment, COUNT(centerOfExcellence) as centerOfExcellence FROM institution_department JOIN institution ON institution_department.institutionId = institution.institutionId GROUP BY institutionId';
																																																																																																																if(err){
																																																																																																																	console.log("Pending books not found");
																																																																																																																}else{
																																																																																																																	console.log("Pending books  found");

																																																																																																																	db.query(insticert,(err,institutioncert)=>{
																																																																																																																		var dirspecial = 'SELECT faculty.fname, faculty.mname, faculty.lname, faculty.educationalAttainment, faculty.specialization, institution.institutionName FROM institution JOIN faculty ON faculty.facultyId = institution.directorId'
																																																																																																																		if(err){
																																																																																																																			console.log("Institution Certification error");
																																																																																																																		}else{
																																																																																																																			console.log("Institution Certification success");

																																																																																																																			db.query(dirspecial,(err,directortable)=>{
																																																																																																																				var reg = 'SELECT * FROM region';
																																																																																																																				if(err){
																																																																																																																					console.log("Institution director data table error");
																																																																																																																				}else{
																																																																																																																					console.log("Institution director data table success");

																																																																																																																					db.query(reg,(err,regName)=>{
																																																																																																																						if(err){
																																																																																																																							console.log("Region data error");	
																																																																																																																						}else{
																																																																																																																							console.log("Region data success");
																																																																																																																							var d = new Date();
																																																																																																																							var doc = new pdf();
																																																																																																																							var c = "Certified";
																																																																																																																							var n = "N/A";
																																																																																																																							//Institution Data PDF
																																																																																																																							doc.pipe(fs.createWriteStream("reports/0/Institution.pdf"));
																																																																																																																							doc.font("Times-Roman");
																																																																																																																							doc.fontSize("12");
																																																																																																																							
																																																																																																																							var str = "INSTITUTION DATA\n\nINSTITUTION NAME / DIRECTOR INFORMATION";
																																																																																																																							
																																																																																																																							directortable.forEach(function(data){
																																																																																																																								str += "\n- " + data.institutionName +" / "+ data.lname +", "+ data.fname +" "+ data.mname;
																																																																																																																							});
																																																																																																																							
																																																																																																																							str += "\n\nLIST OF INSTITUTIONS\n\nINSTITUTION NAME / REGION";
																																																																																																																							
																																																																																																																							listinstitute.forEach(function(data){
																																																																																																																								str += "\n- "+ data.institutionName  +" / "+ data.region;
																																																																																																																							});
																																																																																																																							
																																																																																																																							str += "\n\n Printed on " + d.toDateString();
																																																																																																																							
																																																																																																																							doc.text(str, 100, 100);
																																																																																																																							doc.end();
																																																																																																																							//School Data PDF
																																																																																																																							var doc = new pdf();
																																																																																																																							
																																																																																																																							doc.pipe(fs.createWriteStream("reports/0/School.pdf"));
																																																																																																																							doc.font("Times-Roman");
																																																																																																																							doc.fontSize("12");
																																																																																																																							
																																																																																																																							var str = "SCHOOL DATA\n\nSCHOOL NAME / INSTITUTION NAME / DEAN";
																																																																																																																							
																																																																																																																							schoolTables.forEach(function(data){
																																																																																																																								str += "\n- " + data.schoolName + " / " + data.institutionName + " / " + data.lname + ", " + data.fname;
																																																																																																																							});
																																																																																																																							
																																																																																																																							str += "\n\n Printed on " + d.toDateString();
																																																																																																																							
																																																																																																																							doc.text(str, 100, 100);
																																																																																																																							doc.end();
																																																																																																																							//Department Data PDF
																																																																																																																							var doc = new pdf();
																																																																																																																							
																																																																																																																							doc.pipe(fs.createWriteStream("reports/0/Department.pdf"));
																																																																																																																							doc.font("Times-Roman");
																																																																																																																							doc.fontSize("12");
																																																																																																																							
																																																																																																																							var str = "DEPARTMENT DATA\n\nINSTITUTION NAME / SCHOOL NAME / DEPARTMENT NAME / CHAIRMAN / CENTER OF DEVELOPMENT / CENTER OF EXCELLENCE";
																																																																																																																							
																																																																																																																							departmenttables.forEach(function(data){
																																																																																																																								str += "\n- " +data.institutionName+" / "+data.schoolName+" / "+data.departmentName+" / "+data.lname+", "+data.fname+" / "+data.centerOfDevelopment+" / "+data.centerOfExcellence;
																																																																																																																							});
																																																																																																																							
																																																																																																																							str += "\n\n Printed on " + d.toDateString();
																																																																																																																							
																																																																																																																							doc.text(str, 100, 100);
																																																																																																																							doc.end();
																																																																																																																							//Faculty Data PDF
																																																																																																																							var doc = new pdf();
																																																																																																																							
																																																																																																																							doc.pipe(fs.createWriteStream("reports/0/Faculty.pdf"));
																																																																																																																							doc.font("Times-Roman");
																																																																																																																							doc.fontSize("12");
																																																																																																																							
																																																																																																																							var str = "FACULTY DATA\n\nINSTITUTION NAME / FACULTY NAME / POSITION";
																																																																																																																							
																																																																																																																							chedfactables.forEach(function(data){
																																																																																																																								str += "\n- "+data.institutionName+" / "+data.lname+", "+data.fname+" / "+data.position;
																																																																																																																							});
																																																																																																																							
																																																																																																																							str += "\n\n Printed on " + d.toDateString();
																																																																																																																							
																																																																																																																							doc.text(str, 100, 100);
																																																																																																																							doc.end();
																																																																																																																							//Program Data PDF
																																																																																																																							var doc = new pdf();
																																																																																																																							
																																																																																																																							doc.pipe(fs.createWriteStream("reports/0/Program.pdf"));
																																																																																																																							doc.font("Times-Roman");
																																																																																																																							doc.fontSize("12");
																																																																																																																							
																																																																																																																							var str = "PROGRAM DATA\n\nINSTITUTION NAME / PROGRAM NAME / POPULATION / YEAR";
																																																																																																																							
																																																																																																																							programtablesql.forEach(function(data){
																																																																																																																								str += "\n- "+data.institutionName+" / "+data.programName+" / "+data.population+" / "+data.year;
																																																																																																																							});
																																																																																																																							
																																																																																																																							str += "\n\n Printed on " + d.toDateString();
																																																																																																																							
																																																																																																																							doc.text(str, 100, 100);
																																																																																																																							doc.end();
																																																																																																																							res.render("chedmenu", { id: req.session.userId, data: result, error: 0, regName:regName,directortable:directortable,institutioncert:institutioncert,schoolfaculties:schoolfaculties,programnotoffered:programnotoffered,programoffered:programoffered,researchfac:researchfac,journalfac:journalfac,bookfac:bookfac,agerange:agerange,grpdepartment:grpdepartment,chedfactables: chedfactables, grpschool:grpschool,distinctinstitution:distinctinstitution,averageregion: averageregion, linePopulation: linePopulation,departmenttables: departmenttables, directorinstidata: directorinstidata, institutiondata: institutiondata,listinstitute: listinstitute,avedeptschool: avedeptschool, avedepartment: avedepartment,certification: certification, aveschool: aveschool, averagefaculty: averagefaculty, studentenrollee: studentenrollee, institutioncount: institutioncount, schoolcount: schoolcount, departmentcount: departmentcount, facultycount: facultycount, degree: degree, programcount: programcount, faculty:faculty, alladmin:alladmin, institutionregion: institutionregion, facultylevel: facultylevel, facultygender: facultygender, facultyage: facultyage, specialization: specialization, facultyschoolgraduate: facultyschoolgraduate, cod: cod, coe: coe, delc: delc, schoolTables: schoolTables, allSchool: allSchool , allProgram: allProgram, allDept: allDept, studentPerSchool:studentPerSchool, programsum:programsum, programtablesql:programtablesql, pubCount:pubCount, category: category, journalcategory: journalcategory, researchcategory: researchcategory, thesiscategory: thesiscategory, yearbook: yearbook, yearjournal: yearjournal, yearresearch: yearresearch} );
																																																																																																																					}
																																																																																																																						
																																																																																																																					})
																																																																																																																					}
																																																																																																																			})
																																																																																																																			}
																																																																																																																	})
																																																																																																																	}
																																																																																																															});
																																																																																																															console.log("Pending books  found");
																																																																																																														}
																																																																																																													});
																																																																																																													console.log("year books  found");
																																																																																																												}
																																																																																																											});
																																																																																																											console.log("Pending books  found");
																																																																																																										}
																																																																																																									});
																																																																																																									console.log("category research  found");
																																																																																																								}
																																																																																																							});
																																																																																																							console.log("Pending books  found");
																																																																																																						}
																																																																																																					});
																																																																																																					console.log("book category  found");
																																																																																																				}
																																																																																																			});
																																																																																																			console.log("Faculty per school success");
																																																																																																		}
																																																																																																	})
																																																																																																}
																																																																																															})
																																																																																														}
																																																																																													})
																																																																																												}
																																																																																											})
																																																																																											}
																																																																																									})
																																																																																							}
																																																																																							})
																																																																																							}
																																																																																					})
																																																																																					}
																																																																																			})
																																																																																		}
																																																																																	})
																																																																																}
																																																																															})
																																																																															
																																																																														}
																																																																													})
																																																																												}
																																																																											})
																																																																											}

																																																																									})
																																																																								}

																																																																							})	
																																																																							
																																																																							}
																																																																						})

																																																																					}
																																																																				})
																																																																			}
																																																																		})
																																																																	
																																																																	}
																																																																})
																																																															}
																																																														});
																																																													}
																																																												});
																																																											}
																																																										});
																																																										}

																																																									});
																																																								}
																																																								
																																																						});
																																																						}
																																																				});
																																																			}
																																																		});
																																																	}
																																																});
																																																}
																																														});
																																														
																																													}
																																												});
																																											}
																																										});
																																								}
																																							});
																																						}

																																					});
																																				}


																																			});

																																			}



																																		});


																																	}
																																});
																															}
																														});
																													}
																												});
																											}
																										});
																									
																									}
																							});
																							
																							}
																						});
																						
																					}
																				});
																				
																			}
																		});
																		
																	}
																})

															}


														})
													}
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});


	}else{
		res.redirect("/");
	}
});

app.get("/admin", function(req, res){
	fault = req.query.fault;

	switch(fault){
		case '1':req.flash('fail','Error in chosen school!');
				res.locals.message = req.flash();break;
		case '2':req.flash('fail','Error in chosen department!');
				res.locals.message = req.flash();break;
		case '3':req.flash('fail','Invalid email or inputted data!');
				res.locals.message = req.flash();break;
		case '4':req.flash('fail','The email is not valid!');
				res.locals.message = req.flash();break;
		case '5':req.flash('fail','The email already exists!');
				res.locals.message = req.flash();break;
		case '6':req.flash('fail',"Program's data for year already exists!");
				res.locals.message = req.flash();break;
		default: res.locals.message= "Success";break;
	}
	
	if(req.session.userId != null && req.session.accessLevel == 1){
		var sql = "SELECT * FROM faculty WHERE facultyId = " + req.session.userId;
							

		db.query(sql, (err, result) => {
				if(err || result[0] == null){
					console.log("Admin data retrieval error");
				}else{
					var query = "SELECT institution.institutionId AS institutionId, directorId, institutionName, institution.address, institution.region_id, institution_school.schoolId AS schoolId, deanId, schoolName, institution_department.departmentId AS departmentId, chairmanId, departmentName, institution_program.programId, programName, facultyId, fname, lname, mname FROM institution LEFT JOIN institution_school ON institution.institutionId = institution_school.institutionId LEFT JOIN school ON institution_school.schoolId = school.schoolId LEFT JOIN institution_department ON institution_department.schoolId = institution_school.schoolId LEFT JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN faculty ON institution.institutionId = faculty.institutionId LEFT JOIN institution_program ON institution_program.departmentId = institution_department.departmentId LEFT JOIN program ON institution_program.programId = program.programId WHERE institution.institutionId = "+result[0].institutionId+" AND faculty.facultyId = "+result[0].facultyId+"";
					var schoolQuery = "SELECT institution_school.schoolId, institution_school.deanId, school.schoolName FROM school JOIN institution_school ON school.schoolId = institution_school.schoolId WHERE institutionId = "+ result[0].institutionId+" ORDER BY schoolName ASC";

					db.query(query, (err, mainData) => {
						if(err){
							console.log("Institution data retrieval error");
						}else{
							console.log("Institution data retrieval success");

							db.query(schoolQuery, (err, distinctSchool) => {
								var departmentQuery = "SELECT institution_department.departmentId AS departmentId, chairmanId, departmentName, centerOfExcellence, centerOfDevelopment FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId WHERE institution_department.institutionId = "+result[0].institutionId+" ORDER BY departmentName ASC";

								if(err){
									console.log("Distinct School Data Retrieval Error");
								}else{
									console.log("Distinct School Data Retrieval Success");

									db.query(departmentQuery, (err, distinctDepartment) => {
										var programQuery = "SELECT institution_program.programId, program.programName FROM institution_program JOIN program ON institution_program.programId = program.programId WHERE institution_program.institutionId = "+ result[0].institutionId +" ORDER BY programName ASC";

										if(err){
											console.log("Distinct Department Data Retrieval Error");
										}else{
											console.log("Distinct Department Data Retrieval Success");

											db.query(programQuery, (err, distinctProgram) => {
												var assignQuery = "SELECT * FROM faculty WHERE accessLevel = '5' AND institutionId = "+result[0].institutionId+" ORDER BY lname ASC";

												if(err){
												console.log("Distinct Program Data Retrieval Error");
												}else{
												console.log("Distinct Program Data Retrieval Success");

												db.query(assignQuery, (err, assignPos) => {
												var countfaculty = 'SELECT COUNT(facultyId) as FacultyLevel, position FROM faculty WHERE institutionId = '+result[0].institutionId+' AND accessLevel > "1" GROUP BY accessLevel';

													if(err){
														console.log("Faculty Data Retrieval Error");
													}else{
														console.log("Faculty Data Retrieval Success");

													db.query(countfaculty, (err,facultycount) =>{
														var countSchool = "SELECT COUNT(institution_school.schoolId) as School FROM institution_school LEFT JOIN institution ON institution_school.institutionId = institution.institutionId WHERE institution.institutionId = "+result[0].institutionId;
														if (err) {
															console.log("Faculty count error");
														}else{
															console.log("Faculty count success");

															db.query(countSchool, (err,schoolcount) =>{
																var countDepartment = "SELECT COUNT(institution_department.departmentId) as Department FROM institution_department LEFT JOIN institution_school on institution_department.schoolId = institution_school.schoolId LEFT JOIN institution ON institution_school.institutionId = institution.institutionId WHERE institution.institutionId = "+ result[0].institutionId;
																if (err) {
																	console.log("School count error");
																}else{
																	console.log("School count success");

																	db.query(countDepartment, (err,departmentcount) => {
																		var countProgram ="SELECT COUNT(institution_program.programId) as Program FROM institution_program LEFT JOIN institution ON institution_program.institutionId = institution.institutionId WHERE institution.institutionId = "+result[0].institutionId+"";
																		if(err){
																			console.log("Deparment Count error");
																		}else{
																			console.log("Department Count success");

																			db.query(countProgram, (err, programcount) => {
																				var address = "SELECT address FROM institution WHERE institutionId = "+ result[0].institutionId;
																				if(err){
																					console.log("Program count error");
																				}else{
																					console.log("Program count success");

																					db.query(address , (err,institutionaddress) => {
																						if(err){
																							console.log(address);
																							console.log("Address Error");
																						}else{
																							console.log("Address Success");

																							var facultyData = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, DATE_FORMAT(dateHired,"%M %d %Y") as dateHired, email FROM faculty WHERE institutionId = "'+result[0].institutionId+'" AND accessLevel > "1"';

																							db.query(facultyData, (err, facultyData) => {

																								if(err){
																									console.log("Faculty Book Data retrieval error");
																								}else{
																									console.log("Faculty Book Data retrieval success");

																									var facultyJournal = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, journal.title as journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume as journalVolume, journal.journalVerificationLevel FROM faculty  LEFT JOIN faculty_journal on faculty_journal.facultyId = faculty.facultyId LEFT JOIN journal on journal.journalId = faculty_journal.journalId WHERE institutionId = "'+result[0].institutionId+'" AND accessLevel > "1" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, journal.title as journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume as journalVolume, journal.journalVerificationLevel FROM journal LEFT JOIN faculty_journal on faculty_journal.journalId = journal.journalId LEFT JOIN faculty on faculty.facultyId = faculty_journal.facultyId WHERE institutionId = "'+result[0].institutionId+'" AND accessLevel > "1"';

																									db.query(facultyJournal, (err, facultyJournal) => {

																										if(err){
																											console.log("Faculty Journal Data retrieval error");
																										}else{
																											console.log("Faculty Journal Data retrieval success");

																											var facultyResearch = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description as researchDescriptions, research.coresearchers, research.researchVerificationLevel FROM faculty  LEFT JOIN faculty_research on faculty_research.facultyId = faculty.facultyId LEFT JOIN research on research.researchId = faculty_research.researchId WHERE institutionId = "'+result[0].institutionId+'" AND accessLevel > "1" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description as researchDescriptions, research.coresearchers, research.researchVerificationLevel FROM research LEFT JOIN faculty_research on faculty_research.researchId = research.researchId LEFT JOIN faculty on faculty.facultyId = faculty_research.facultyId WHERE institutionId = "'+result[0].institutionId+'" AND accessLevel > "1"';

																											db.query(facultyResearch, (err, facultyResearch) => {
																											var facultygender = 'SELECT COUNT(facultyId) as FacultyGender, gender FROM faculty LEFT JOIN institution ON faculty.institutionId = institution.institutionId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY gender';
																												if(err){
																													console.log("Faculty Research Data retrieval error");
																												}else{
																													console.log("Faculty Research Data retrieval success");

																													db.query(facultygender, (err,genderfac) => {
																													var facdegree= 'SELECT COUNT(facultyId) AS facdegree, educationalAttainment FROM faculty LEFT JOIN institution ON faculty.institutionId = institution.institutionId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY educationalAttainment ORDER BY facdegree ASC';
																														if(err){
																															console.log("Gender retrieval error");
																														}else{
																														console.log("Gender retrieval success");

																														db.query(facdegree, (err,facultydegree) => {
																															var facultyBook = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM faculty  LEFT JOIN faculty_book on faculty_book.facultyId = faculty.facultyId LEFT JOIN book on book.bookId = faculty_book.bookId WHERE institutionId = '+result[0].institutionId+' AND accessLevel > "1" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM book LEFT JOIN faculty_book on faculty_book.bookId = book.bookId LEFT JOIN faculty on faculty.facultyId = faculty_book.facultyId WHERE institutionId = '+result[0].institutionId+' AND accessLevel > "1"';

																															if(err){
																															console.log("Degree retrieval error");
																															}else{
																															console.log("Degree retrieval success");

																													
																															db.query(facultyBook, (err, facultyBook) => {
																																var programData = 'SELECT programdata.programId, program.programName, programdata.year AS programDataYear, programdata.availability, programdata.population, department.departmentName, schoolName, programdata.institutionId AS institutionId, institutionName FROM programdata JOIN program ON programdata.programId = program.programId JOIN school ON school.schoolId = programdata.schoolId JOIN department ON programdata.departmentId = department.departmentId JOIN institution ON institution.institutionId = programdata.institutionId WHERE programdata.institutionId = ' + result[0].institutionId;

																																if(err){
																																	console.log("Faculty Book retrieval error");
																																}else{
																																	console.log("Faculty Book retrieval success");
																																

																																db.query(programData, (err, programData) => {
																																	var studentData = 'SELECT studentdata.departmentId as id,institution.institutionId,SUM(enrollees) as enroll, SUM(graduated) as graduate, year,institutionName,departmentName FROM studentdata LEFT JOIN institution ON studentdata.institutionId = institution.institutionId LEFT JOIN department ON studentdata.departmentId = department.departmentId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY year, id';
																																	if(err){
																																		console.log("Program Data retrieval error");

																																	}else{
																																		console.log("Program Data retrieval success");

																																		db.query(studentData, (err, studentData) => {
																																			var age = 'SELECT COUNT(dateOfBirth) AS FacultyAge, YEAR(NOW())- YEAR(dateOfBirth) AS AGE FROM faculty WHERE institutionId = '+result[0].institutionId+' AND accessLevel > "1" GROUP BY age';
																																			if(err){
																																			console.log("Student data retrieval error!");
																																			}else{
																																			console.log("Student data retrieval success!");

																																			db.query(age, (err, facultyage) => {

																																				var reg = 'SELECT COUNT(facultyId) as regFaculty, position FROM faculty WHERE institutionId = '+result[0].institutionId+' AND accessLevel = "5"';
																																				if(err){
																																					console.log("Faculty Age retrieval error");
																																				}else{
																																					console.log("Faculty Age retrieval success");

																																					db.query(reg, (err,regfac) => {
																																					 	var schoolnum = 'SELECT COUNT(faculty.facultyId) as facultyId, schoolName, institutionName FROM faculty JOIN school ON faculty.schoolId = school.schoolId JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.institutionId = '+result[0].institutionId+' GROUP BY schoolName';
																																						if(err){
																																							console.log("Regular faculty retrieval error");
																																						}else{
																																							console.log("Regular faculty retrieval success");

																																							db.query(schoolnum, (err,numSchool) => {
																																								var deptnum = 'SELECT COUNT(institution_department.departmentId) as departmentNumber, departmentName FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId WHERE institution_department.institutionId = '+result[0].institutionId+' GROUP BY departmentName';
																																								if(err){
																																									console.log("School number retrieval error");
																																								}else{
																																									console.log("School number retrieval success");

																																									db.query(deptnum, (err,departmentnumber)=>{
																																										var school = 'SELECT COUNT(institution_school.schoolId) as Schoolnum FROM institution_school WHERE institutionId = '+result[0].institutionId;
																																										if(err){
																																											console.log("Department number retrieval error");
																																										}else{
																																											console.log("Department number retrieval success");


																																													db.query(school, (err, numberschool) => {
																																														var dept = 'SELECT COUNT(institution_department.departmentId) as Deptnum FROM institution_department WHERE institutionId ='+result[0].institutionId;
																																														if(err){
																																															console.log("School count error");
																																														}else{
																																															console.log("School count succces");

																																															db.query(dept,(err, deptnumber) =>{

																																																var facnum = 'SELECT COUNT(facultyId) as FacultyLevel FROM faculty LEFT JOIN institution_department ON faculty.departmentId = institution_department.departmentId WHERE institution_department.institutionId = '+result[0].institutionId+' AND accessLevel > "1"';
																																																if(err){
																																																	console.log("Department count error");
																																																}else{
																																																	console.log("Department count success");

																																																	db.query(facnum, (err,numberfaculty) => {

																																																		var enrollee = 'SELECT institution.institutionId,SUM(population) as population, year,institutionName, departmentName FROM programdata LEFT JOIN institution ON programdata.institutionId = institution.institutionId LEFT JOIN department ON programdata.departmentId = department.departmentId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY year';
																																																		if(err){
																																																			console.log("Faculty number count in admin error");
																																																		}else{
																																																			console.log("Faculty number count in admin success");

																																																			db.query(enrollee, (err,studentenrollee) => {
																																																			console.log(studentenrollee);
																																																				var special = 'SELECT COUNT(facultyId) as facspecial, specialization FROM faculty WHERE accessLevel > "1" AND institutionId = '+result[0].institutionId+' GROUP BY specialization';
																																																				if(err){
																																																					console.log("Enrollee retrieval error");
																																																				}else{
																																																					console.log("Enrollee retrieval success");

																																																					db.query(special, (err,facultyspecial) => {
																																																						var avefacsch = 'SELECT AVG(facaverage) as AverageFacultySch FROM (SELECT COUNT(facultyId) AS facaverage, schoolName FROM faculty JOIN school ON faculty.schoolId = school.schoolId WHERE faculty.institutionId = '+result[0].institutionId+' GROUP BY schoolName ) AS sample';
																																																						if(err){
																																																							console.log("Faculty specialization retrival error");
																																																						}else{
																																																							console.log("Faculty specialization retrival success");

																																																							db.query(avefacsch, (err,avefacschool) => {
																																																							console.log(avefacschool);
																																																							var avefacdep = 'SELECT AVG(facaverage) as AverageFacultyDep, departmentName FROM (SELECT COUNT(facultyId) AS facaverage, departmentName FROM faculty JOIN institution_department ON faculty.departmentId = institution_department.departmentId JOIN department ON institution_department.departmentId = department.departmentId JOIN institution ON institution_department.institutionId = institution.institutionId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY departmentName ) AS sample';
																																																								if(err){
																																																									console.log("Average faculty per school retrieval error");
																																																								}else{
																																																									console.log("Average faculty per school retrieval success");

																																																									db.query(avefacdep, (err,avefacdepartment) =>{
																																																									var instiprog = 'SELECT programName, departmentName, schoolName FROM institution_program JOIN program ON institution_program.programId = program.programId JOIN department ON institution_program.departmentId = department.departmentId JOIN school ON institution_program.schoolId = school.schoolId WHERE institution_program.institutionId = '+result[0].institutionId+'';
																																																										if(err){
																																																											console.log("Average faculty per department retrieval error");
																																																										}else{
																																																											console.log("Average faculty per department retrieval success");

																																																											db.query(instiprog,(err,institutionprogram) =>{
																																																												var schooltable = 'SELECT DISTINCT institution_school.schoolId, institution_school.deanId, fname, lname, school.schoolName AS schoolName FROM faculty JOIN institution_school ON faculty.facultyId = institution_school.deanId JOIN school ON institution_school.schoolId = school.schoolId WHERE institution_school.institutionId = '+result[0].institutionId+' AND accesslevel = "3"';
																																																												if(err){
																																																													console.log("Institution program data retrieval error");
																																																												}else{
																																																													console.log("Institution program data retrieval success");

																																																													db.query(schooltable,(err,schooltableinfo) => {
																																																														var depttableinstitution = 'SELECT schoolName, departmentName, fname,lname FROM faculty JOIN institution_department ON institution_department.chairmanId = faculty.facultyId JOIN department ON department.departmentId = institution_department.departmentId LEFT JOIN school ON school.schoolId = institution_department.schoolId WHERE faculty.institutionId = '+result[0].institutionId+' and accessLevel = "4"';
																																																														if(err){
																																																															console.log("School data table error");
																																																														}else{
																																																															console.log("School data table success");

																																																															db.query(depttableinstitution, (err,depttableinstitution) => {
																																																																var depcenterDev = 'SELECT COUNT(institution_department.departmentId) as centerOfDevelopment FROM institution_department LEFT JOIN institution ON institution_department.institutionId = institution.institutionId WHERE centerOfDevelopment = "Certified" AND institution.institutionId = '+result[0].institutionId+'';
																																																																if(err){
																																																																	console.log("Department institution datatable error");
																																																																}else{
																																																																	console.log("Department institution datatable success");

																																																																	db.query(depcenterDev, (err,departmentDevelopment) =>{
																																																																		var depcenterExc = 'SELECT COUNT(institution_department.departmentId) as centerOfExcellence FROM institution_department LEFT JOIN institution ON institution_department.institutionId = institution.institutionId WHERE centerOfExcellence = "Certified" AND institution.institutionId = '+result[0].institutionId+'';
																																																																		if(err){
																																																																			console.log("Department center of development retrieval error");
																																																																		}else{
																																																																			console.log("Department center of development retrieval success");

																																																																			db.query(depcenterExc, (err,departmentExcellence) => {
																																																																				var faclist = 'SELECT  faculty.facultyId as facultyId,schoolName,fname, lname, position FROM faculty JOIN institution ON faculty.institutionId = institution.institutionId JOIN school ON faculty.schoolId = school.schoolId WHERE institution.institutionId = '+result[0].institutionId+'';
																																																																				if(err){
																																																																					console.log("Department center of excellence retrieval error")
																																																																				}else{
																																																																					console.log("Department center of excellence retrieval success");

																																																																					db.query(faclist,(err,facultylist) =>{
																																																																						var addSchoolList = "SELECT * FROM school WHERE schoolId NOT IN (SELECT schoolId FROM institution_school WHERE institutionId = "+result[0].institutionId+") ORDER BY schoolName ASC";
																																																																						if(err){
																																																																							console.log("Faculty list data table error");
																																																																						}else{
																																																																							console.log("Faculty list data tables success");

																																																																							db.query(addSchoolList, (err, addSchoolList) =>{
																																																																								var addDepartmentList = "SELECT * FROM department WHERE departmentId NOT IN (SELECT departmentId FROM institution_department WHERE institutionId = "+result[0].institutionId+") ORDER BY departmentName ASC";
																																																																								if(err){
																																																																										console.log("School List error.");
																																																																								}else{
																																																																										console.log("School list retrieved.");

																																																																										db.query(addDepartmentList, (err, addDepartmentList) => {
																																																																											var addProgramList = "SELECT * FROM program WHERE programId NOT IN (SELECT programId FROM institution_program WHERE institutionId = "+result[0].institutionId+") ORDER BY programName ASC";		
																																																																												if(err){
																																																																													console.log("Department list error.");
																																																																												}else{
																																																																													console.log("Department list retrieved.");

																																																																													db.query(addProgramList, (err, addProgramList) => {
																																																																														var adminfacrange = 'SELECT SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 20 AND 30 THEN 1 ELSE 0 END) AS "twentyTothirty", SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 30 AND 40 THEN 1 ELSE 0 END) AS "thirtyToforty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 40 AND 50 THEN 1 ELSE 0 END) AS "fortyTofifty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 50 AND 60 THEN 1 ELSE 0 END) AS "fiftyTosixty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 60 AND 70 THEN 1 ELSE 0 END) AS "sixtyToseventy",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 70 AND 80 THEN 1 ELSE 0 END) AS "seventyToeighty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 80 AND 90 THEN 1 ELSE 0 END) AS "eightyToninety" FROM faculty WHERE faculty.institutionId = '+result[0].institutionId+'';
																																																																														
																																																																														if(err){
																																																																															console.log("Program list error.");
																																																																														}else{
																																																																															console.log("Program list retrieved.");

																																																																															db.query(adminfacrange,(err,adminfacage)=>{
																																																																																var progcount = 'SELECT department.departmentName as depName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' GROUP BY institution_program.departmentId'
																																																																																if(err){
																																																																																	console.log("Admin faculty age group error");
																																																																																}else{
																																																																																	console.log("Admin faculty age group success");

																																																																																	db.query(progcount,(err,countprog)=>{
																																																																																		var progave = 'SELECT AVG(temp) as avetemp FROM (SELECT department.departmentName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' GROUP BY institution_program.departmentId) AS A'
																																																																																		if(err){
																																																																																			console.log("Program count error");
																																																																																		}else{
																																																																																			console.log("Program count success");

																																																																																			db.query(progave,(err,averageprograms)=>{
																																																																																				var progdata = 'SELECT institution.institutionId, programName, SUM(population) as population, year,availability FROM programdata JOIN program ON programdata.programId = program.programId JOIN institution ON programdata.institutionId = institution.institutionId WHERE programdata.institutionId = '+result[0].institutionId+' GROUP BY year ORDER BY year ASC'
																																																																																				if(err){
																																																																																					console.log("Program count error.");
																																																																																				}else{
																																																																																					console.log("Program average success.");

																																																																																					db.query(progdata,(err,progdatatable)=>{
																																																																																						var allRegion = 'SELECT * FROM region';
																																																																																						if(err){
																																																																																							console.log("Program data tables error");
																																																																																						}else{
																																																																																							console.log("Program data table success");
																																																																																							
																																																																																							db.query(allRegion,(err,allRegion) =>{
																																																																																								if(err){
																																																																																									console.log("All region retrieval error.");
																																																																																								}else{
																																																																																									console.log("All region retrieval success.");

																																																																																									var d = new Date();
																																																																																									var doc = new pdf();

																																																																																									//Institution admin school data pdf
																																																																																									doc.pipe(fs.createWriteStream("reports/1/School.pdf"));
																																																																																									doc.font("Times-Roman");
																																																																																									doc.fontSize("12");

																																																																																									var str = "SCHOOL DATA\n\n SCHOOL NAME /  SCHOOL DEAN";

																																																																																									schooltableinfo.forEach(function(data){
																																																																																										str += "\n - "+data.schoolName+" / "+data.lname+","+data.fname;
																																																																																									});

																																																																																									str += "\n\n Printed on "+ d.toDateString();

																																																																																									doc.text(str, 100,100);
																																																																																									doc.end();

																																																																																									//Institution admin department data pdf
																																																																																									var doc = new pdf();
																																																																																									doc.pipe(fs.createWriteStream("reports/1/Department.pdf"));
																																																																																									doc.font("Times-Roman");
																																																																																									doc.fontSize("12");

																																																																																									var str = "\n\nLIST OF DEPARTMENTS\n\n DEPARTMENT NAME / CHAIRMAN";

																																																																																									depttableinstitution.forEach(function(data){
																																																																																										str += "\n - "+data.departmentName+" / "+data.lname+","+data.fname;
																																																																																									});

																																																																																									str += "\n\n Printed on "+ d.toDateString();

																																																																																									doc.text(str, 100,100);
																																																																																									doc.end();

																																																																																									//Institution admin faculty data pdf

																																																																																									var doc = new pdf();
																																																																																									doc.pipe(fs.createWriteStream("reports/1/Faculty.pdf"));
																																																																																									doc.font("Times-Roman");
																																																																																									doc.fontSize("12");

																																																																																									var str = "\n\nFACULTY DATA\n\n SCHOOL NAME / FACULTY NAME / POSITION";

																																																																																									facultylist.forEach(function(data){
																																																																																										str += "\n - "+data.schoolName+" / "+data.lname+","+data.fname+" / "+data.position;
																																																																																									});

																																																																																									str += "\n\n Printed on "+ d.toDateString();

																																																																																									doc.text(str, 100,100);
																																																																																									doc.end();

																																																																																									//Institution admin program data

																																																																																									var doc = new pdf();
																																																																																									doc.pipe(fs.createWriteStream("reports/1/Program.pdf"));
																																																																																									doc.font("Times-Roman");
																																																																																									doc.fontSize("12");

																																																																																									var str = "\n\PROGRAM DATA\n\n PROGRAM NAME";

																																																																																									institutionprogram.forEach(function(data){
																																																																																										str += "\n - "+data.programName;
																																																																																									});



																																																																																									str += "\n\n Printed on "+ d.toDateString();

																																																																																									doc.text(str, 100,100);
																																																																																									doc.end();

																																																																																								res.render("adminmenu", { progdatatable:progdatatable,averageprograms:averageprograms,countprog:countprog,facultylist: facultylist, adminfacage:adminfacage,departmentExcellence: departmentExcellence,departmentDevelopment: departmentDevelopment, depttableinstitution: depttableinstitution,schooltableinfo: schooltableinfo,institutionprogram: institutionprogram, avefacdepartment: avefacdepartment, avefacschool: avefacschool, facultyspecial: facultyspecial, studentenrollee: studentenrollee, numberfaculty: numberfaculty, deptnumber: deptnumber, numberschool: numberschool, numSchool: numSchool, departmentnumber: departmentnumber, programData: programData, facultyage: facultyage, regfac: regfac, facultyBook: facultyBook, facultyResearch: facultyResearch, facultyJournal: facultyJournal, result: result, data: mainData, distinctProgram: distinctProgram, distinctDepartment: distinctDepartment, distinctSchool: distinctSchool, assignPos: assignPos, facultycount: facultycount, schoolcount: schoolcount, departmentcount: departmentcount, programcount: programcount, institutionaddress: institutionaddress, facultyData: facultyData, genderfac: genderfac, facultydegree: facultydegree, studentData: studentData, addSchoolList: addSchoolList, addDepartmentList: addDepartmentList, addProgramList: addProgramList, allRegion:allRegion} );

																																																																																								}

																																																																																							})
																																																																																							}
																																																																																					})
																																																																																					}
																																																																																			})
																																																																																			}
																																																																																	})
																																																																																	}
																																																																															})
																																																																															}
																																																																													})
																																																																													
																																																																						
																																																																												}
																																																																										})
																																																																										
																																																																								}
																																																																							})
																																																																						}
																																																																					});
																																																																				}
																																																																			});
																																																																		}
																																																																	});
																																																																}
																																																															});
																																																														}
																																																													});
																																																													}
																																																											});
																																																											}
																																																									});
																																																								}
																																																							});
																																																						}
																																																					});
																																																				}
																																																			});
																																																		}
																																																	});
																																																}
																																															});
																																														}
																																													});
																																										}
																																									});
																																								}
																																							});
																																						}
																																					});
																																				}
																																			});
																																			}
																																			
																																		});
																																			
																																	}
																																});

																																	
																																}
																															});
																															
																															
																												
																															}
																														});
																														
																														}
																													});

																													}
																											});

																										}
																									});

																									}
																							});
																						}
																					});
																				}
																			});
																		}
																	});
																}
															});

														}
													});
													}
													});
												}
											});
										}
									});

								}
							});

						}
					});
				}
			});
	}else{
		res.redirect("/");
	}
	
});


app.get("/director", function(req, res){

	var fault = req.query.fault;
	switch(fault){
		
		default: res.locals.message= "Success";break;
	}
	if(req.session.userId != null && req.session.accessLevel == 2){
		var sql = "SELECT * FROM institution WHERE institutionId = " + req.session.institutionId;

		db.query(sql, (err, result) => {
				if(err || result[0] == null){
					console.log("Institution data retrieval error");
				}else{
					var query = 'SELECT educationalAttainment, schoolGraduated, specialization, dateOfBirth, fname, lname, mname, position, email, yearGraduated, institution.institutionId, directorId, institutionName, institution.address, institution_school.schoolId AS schoolId,deanId, schoolName, department.departmentId AS departmentId, chairmanId, departmentName, institution_program.programId, programName, facultyId, fname, lname,mname FROM faculty LEFT JOIN institution ON faculty.institutionId = institution.institutionId LEFT JOIN institution_school ON institution.institutionId = institution_school.institutionId JOIN school ON institution_school.schoolId = school.schoolId LEFT JOIN institution_department ON institution_school.schoolId = institution_department.schoolId JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution_program ON institution_department.departmentId = institution_program.departmentId JOIN program ON institution_program.programId = program.programId WHERE institution.institutionId = "'+ result[0].institutionId+'" AND faculty.accessLevel = "2"';
					db.query(query, (err, data) => {
						var directorfacultyData = 'SELECT facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, DATE_FORMAT(dateHired,"%M %d %Y") as dateHired, email FROM faculty WHERE institutionId = '+result[0].institutionId+' AND (accessLevel = "4" OR accessLevel = "3" OR accessLevel = "5")';
						if(err){
							console.log("Institution Director data retrieval error");
						}else{
							console.log("Institution Director data retrieval success");

							db.query(directorfacultyData, (err, directorfaculty) => {
									var countfaculty = 'SELECT COUNT(facultyId) as facultycount FROM faculty WHERE institutionId = '+result[0].institutionId+' AND accessLevel > "2"';
								if(err){
									console.log("Director faculty retrieval error");
								}else {
									console.log("Director faculty retrieval success");

									db.query(countfaculty, (err,facultycount) => {
										var countSchool = 'SELECT COUNT(institution_school.schoolId) as Schoolnum, school.schoolName AS schoolName FROM institution_school JOIN school ON institution_school.schoolId = school.schoolId WHERE institutionId = '+result[0].institutionId+' GROUP BY schoolName';
										if (err) {
											console.log("Faculty count error");
										} else {
											console.log("Faculty count success");

											db.query(countSchool, (err,schoolcount) => {
												var countDepartment = 'SELECT COUNT(institution_department.departmentId) as departmentNum, departmentName FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId WHERE institutionId = '+result[0].institutionId+' GROUP BY departmentName';
												if (err) {
													console.log("School count error");
												} else {
													console.log("School count success");

													db.query(countDepartment, (err, departmentcount) => {
														var countProgram ="SELECT COUNT(programId) as Program FROM institution_program LEFT JOIN institution_department ON institution_program.departmentId = institution_department.departmentId LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId JOIN school ON institution_school.schoolId = school.schoolId LEFT JOIN institution ON institution.institutionId = institution_school.institutionId WHERE institution.institutionId = "+ result[0].institutionId;
														if (err) {
															console.log("Department count error");
														} else {
															console.log("Department count success");

															db.query(countProgram, (err, programcount) => {
																var age = 'SELECT COUNT(dateOfBirth) AS FacultyAge, YEAR(NOW())- YEAR(dateOfBirth) AS AGE FROM faculty WHERE institutionId = '+result[0].institutionId+' GROUP BY age';
																if (err) {
																	console.log("Program count error");
																} else {
																	console.log("Program count success");

																	db.query(age, (err,facultyage) => {
																		var facspecial = 'SELECT COUNT(facultyId) as Facspecial, specialization FROM faculty WHERE institutionId = '+result[0].institutionId+' GROUP BY specialization';

																		if(err){
																			console.log("Faculty age error");
																		}else{
																			console.log("Faculty age success");

																			db.query(facspecial,(err,facultyspecialization)=>{
																				var graduate = 'SELECT COUNT(facultyId) as FacultyGraduate, schoolGraduated FROM faculty WHERE institutionId = '+result[0].institutionId+' GROUP BY schoolGraduated';
																				if(err){
																					console.log("Special count error");
																				}else{
																					console.log("Special count success");

																					db.query(graduate, (err,facultygraduate) => {
																						var gender = 'SELECT COUNT(facultyId) AS facgender, gender FROM faculty WHERE institutionId = '+result[0].institutionId+' GROUP BY gender';
																						if(err){
																							console.log("Graduate count error");
																						}else{
																							console.log("Graduate count success");

																							db.query(gender, (err,facultygender) => {
																								var faccount = 'SELECT COUNT(facultyId) as countfacultyinstitute, position FROM faculty WHERE institutionId = '+result[0].institutionId+' AND accessLevel > "2" GROUP BY position';
																								if (err) {
																									console.log("Gender count error");
																								} else {
																									console.log("Gender count success");

																									db.query(faccount, (err,facultydirectorcount) => {

																										var enrollee = 'SELECT institution.institutionId,SUM(enrollees) as enrollees, SUM(graduated) as graduated, year,institutionName,departmentName FROM studentdata LEFT JOIN institution ON studentdata.institutionId = institution.institutionId LEFT JOIN department ON studentdata.departmentId = department.departmentId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY year';
																										if (err) {
																											console.log("Faculty count in director error");
																										} else {
																											console.log("Faculty count in director success");

																											db.query(enrollee, (err,studentenrollee) =>{
																												var facavesch = 'SELECT AVG(facaverage) as AverageFacultySchool, schoolName FROM (SELECT COUNT(facultyId) AS facaverage, schoolName FROM faculty JOIN institution_school ON faculty.schoolId = institution_school.schoolId JOIN school ON institution_school.schoolId = school.schoolId JOIN institution ON institution_school.institutionId = institution.institutionId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY schoolName ) AS sample GROUP BY schoolName';
																												if(err){
																													console.log("Student enrollee and graduate retrieval error");
																												}else{
																													console.log("Student enrollee and graduate retrieval success");

																													db.query(facavesch, (err,facaveschool) => {
																														var facavedep = 'SELECT AVG(facaverage) as AverageFacultyDepartment, departmentName FROM (SELECT COUNT(facultyId) AS facaverage, departmentName FROM faculty JOIN institution_department ON faculty.departmentId = institution_department.departmentId JOIN department ON institution_department.departmentId = department.departmentId JOIN institution ON institution_department.institutionId = institution.institutionId WHERE institution.institutionId = '+result[0].institutionId+' GROUP BY departmentName ) AS sample GROUP BY departmentName';
																														if(err){
																															console.log("Faculty average school retrieval error");
																														}else{
																															console.log("Faculty average school retrieval success");

																															db.query(facavedep, (err,facavedepartment) => {
																																var depcenterdevelopment = 'SELECT COUNT(institution_department.departmentId) as depcertdev FROM institution_department LEFT JOIN institution ON institution_department.institutionId = institution.institutionId WHERE centerOfDevelopment = "Certified" AND institution.institutionId = '+result[0].institutionId+'';
																																if(err){
																																	console.log("Faculty average department retrieval error");
																																}else{
																																	console.log("Faculty average department retrieval success");

																																	db.query(depcenterdevelopment, (err, depdevelopment) => {
																																		var depcenterexcellence = 'SELECT COUNT(institution_department.departmentId) as depcertexcel FROM institution_department LEFT JOIN institution ON institution_department.institutionId = institution.institutionId WHERE centerOfExcellence = "Certified" AND institution.institutionId = '+result[0].institutionId+'';
																																		if(err){
																																			console.log("Department Center of development retrieval error");
																																		}else{
																																			console.log("Department Center of development retrieval success");

																																			db.query(depcenterexcellence, (err,depexcellence) => {
																																				var progdata = 'SELECT programdata.programId, program.programName, programdata.year AS programDataYear, programdata.availability as availability, programdata.population as population, department.departmentName, schoolName, programdata.institutionId AS institutionId, institutionName FROM programdata JOIN program ON programdata.programId = program.programId JOIN school ON school.schoolId = programdata.schoolId JOIN department ON programdata.departmentId = department.departmentId JOIN institution ON institution.institutionId = programdata.institutionId WHERE programdata.institutionId = '+result[0].institutionId+' ORDER BY year ASC';
																																				if(err){
																																					console.log("Department center of excellence retrieval error");
																																				}else{
																																					console.log("Department center of excellence retrieval success");

																																					db.query(progdata,(err,dataprogram) =>{
																																					var schooltable = 'SELECT institution_school.schoolId, deanId, fname, lname, schoolName FROM institution_school JOIN school ON institution_school.schoolId = school.schoolId LEFT JOIN faculty on faculty.facultyId = institution_school.deanId WHERE faculty.institutionId = '+result[0].institutionId+' AND accesslevel = "3"';
																																						if(err){
																																							console.log("Institution Program data retrieval error");
																																						}else{
																																							console.log("Institution Program data retrieval success");

																																							db.query(schooltable, (err,schooldatatable) => {
																																								var deptinttable = 'SELECT institution_department.departmentId, departmentName, fname, lname FROM faculty LEFT JOIN institution_department on faculty.facultyId = institution_department.chairmanId LEFT JOIN department ON faculty.departmentId = department.departmentId WHERE faculty.institutionId = '+result[0].institutionId+' AND accesslevel = "4"';
																																								if(err){
																																									console.log("School data table error");
																																								}else{
																																									console.log("School data table success");

																																									db.query(deptinttable, (err,departmenttables) => {
																																										var listfac = 'SELECT  faculty.facultyId as facultyId,schoolName,fname, lname, position FROM faculty LEFT JOIN school ON faculty.schoolId = school.schoolId WHERE faculty.institutionId = '+result[0].institutionId+' AND accessLevel >= "3"';
																																										if(err){
																																											console.log("Department data tables error");
																																										}else{
																																											console.log("Department data tables success");

																																											db.query(listfac, (err,listfaculty) => {
																																												var booker = 'SELECT  book.bookId,category, book.title, book.ISBN, book.edition, book.year, faculty_book.facultyId AS value1, faculty_book.bookId AS value2 FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"  AND bookVerificationLevel = "1"' ;
																																												if(err){
																																													console.log("Faculty list data tables error");
																																												}else{
																																													db.query(booker, (err,booker) => {
																																														var journaler = 'SELECT  journal.journalId,category, title,link, year, volume, faculty_journal.facultyId AS value1, faculty_journal.journalId AS value2 FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND journalVerificationLevel = "1"';
																																														if(err){
																																															console.log("Approved books not found");
																																														}else{
																																															db.query(journaler, (err,journaler) => {
																																																var researcher = 'SELECT  research.researchId, category,year,research.name,research.status, research.collaborations, research.description, research.coresearchers,faculty_research.facultyId AS value1, faculty_research.researchId AS value2 FROM research JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND researchVerificationLevel = "1"';
																																																if(err){
																																																	console.log("Approved journals not found");
																																																}else{
																																																	db.query(researcher, (err,researcher) => {
																																																		var penbooker = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																		if(err){
																																																			console.log("Approved research not found");
																																																		}else{
																																																			db.query(penbooker, (err,penbooker) => {
																																																				var penjournaler = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, lname, fname, faculty.facultyId FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																				if(err){
																																																					console.log("Pending books not found");
																																																				}else{
																																																					db.query(penjournaler, (err,penjournaler) => {
																																																						var penresearcher = 'SELECT research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, faculty.lname, faculty.fname, faculty.facultyId FROM `research` JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																						if(err){
																																																							console.log("Pending journal not found");
																																																						}else{
																																																							db.query(penresearcher, (err,penresearcher) => {
																																																								var directorfacage = 'SELECT SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 20 AND 30 THEN 1 ELSE 0 END) AS "twentyTothirty", SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 30 AND 40 THEN 1 ELSE 0 END) AS "thirtyToforty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 40 AND 50 THEN 1 ELSE 0 END) AS "fortyTofifty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 50 AND 60 THEN 1 ELSE 0 END) AS "fiftyTosixty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 60 AND 70 THEN 1 ELSE 0 END) AS "sixtyToseventy",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 70 AND 80 THEN 1 ELSE 0 END) AS "seventyToeighty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 80 AND 90 THEN 1 ELSE 0 END) AS "eightyToninety" FROM faculty WHERE faculty.institutionId = '+result[0].institutionId+'';
																																																								if(err){
																																																									console.log("Pending research not found");
																																																								}else{
																																																									console.log("Pending research  found");

																																																									db.query(directorfacage,(err,facagegrp)=>{
																																																										var facjournal = 'SELECT DISTINCT faculty.facultyId, journal.title as journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume as journalVolume, journal.journalVerificationLevel FROM faculty  LEFT JOIN faculty_journal on faculty_journal.facultyId = faculty.facultyId LEFT JOIN journal on journal.journalId = faculty_journal.journalId WHERE faculty.institutionId='+result[0].institutionId+'';
																																																										if(err){
																																																											console.log("Director faculty age group error");
																																																										}else{
																																																											console.log("Director faculty age group success");

																																																											db.query(facjournal,(err,facultyjournal)=>{
																																																												var facbook = 'SELECT DISTINCT faculty.facultyId, fname, lname, mname, position, educationalAttainment, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM faculty  LEFT JOIN faculty_book on faculty_book.facultyId = faculty.facultyId LEFT JOIN book on book.bookId = faculty_book.bookId WHERE faculty.institutionId = '+result[0].institutionId+'';
																																																												if(err){
																																																													console.log("Faculty Publication error");
																																																												}else{
																																																													console.log("Faculty Publication success");

																																																													db.query(facbook,(err,facultybook)=>{
																																																														var facresearch = 'SELECT DISTINCT faculty.facultyId, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description as researchDescriptions, research.coresearchers, research.researchVerificationLevel FROM faculty  LEFT JOIN faculty_research on faculty_research.facultyId = faculty.facultyId LEFT JOIN research on research.researchId = faculty_research.researchId WHERE faculty.institutionId = '+result[0].institutionId+'';
																																																														if(err){
																																																															console.log("Faculty book error");
																																																														}else{
																																																															console.log("Faculty book success");

																																																															db.query(facresearch,(err,facultyresearch)=>{
																																																																var category = 'SELECT book.category, COUNT(book.bookId) AS number FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE  faculty.institutionId = '+result[0].institutionId+' AND bookVerificationLevel =1 AND denyStatus =0  GROUP by book.category';
																																																																if(err){
																																																																	console.log("Faculty research error");
																																																																}else{
																																																																	db.query(category, (err,category) => {
																																																																		var journalcategory = 'SELECT journal.category, COUNT(journal.journalId) AS number FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND journalVerificationLevel =1 AND journalDenyStatus =0 GROUP by journal.category'
																																																																		if(err){
																																																																			console.log("Pending books not found");
																																																																		}else{
																																																																			db.query(journalcategory, (err,journalcategory) => {
																																																																				var researchcategory = 'SELECT research.category, COUNT(research.researchId) AS number FROM research JOIN faculty_research ON faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND  researchVerificationLevel =1 AND reserchDenyStatus =0 GROUP by research.category';
																																																																				if(err){
																																																																					console.log("journal category not found");
																																																																				}else{
																																																																					db.query(researchcategory, (err,researchcategory) => {
																																																																						var thesiscategory = 'SELECT thesis.topic, COUNT(thesis.topic) AS number FROM thesis JOIN faculty_thesis ON faculty_thesis.thesisId= thesis.thesisId JOIN faculty ON faculty_thesis.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' GROUP by thesis.topic';
																																																																						if(err){
																																																																							console.log("category res not found");
																																																																						}else{
																																																																							db.query(thesiscategory, (err,thesiscategory) => {
																																																																								var directorprogcount = 'SELECT department.departmentName as depName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' GROUP BY institution_program.departmentId'
																																																																								if(err){
																																																																									console.log("category thesis not found");
																																																																								}else{
																																																																									console.log("category thesis  found");

																																																																									db.query(directorprogcount,(err,countofprograms)=>{
																																																																										var directorprogave = 'SELECT AVG(temp) as avetemp FROM (SELECT department.departmentName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' GROUP BY institution_program.departmentId) AS A'
																																																																										if(err){
																																																																											console.log("Program count error");
																																																																										}else{
																																																																											console.log("Program count success");

																																																																											db.query(directorprogave,(err,averageofprograms)=>{
																																																																												var countfacschool = 'SELECT COUNT(faculty.facultyId) as facultyId, schoolName, institutionName FROM faculty JOIN school ON faculty.schoolId = school.schoolId JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.institutionId = '+result[0].institutionId+' GROUP BY schoolName';
																																																																												if(err){
																																																																													console.log("Program average error");
																																																																												}else{
																																																																													console.log("Program average success");

																																																																													db.query(countfacschool,(err,facultyperschool)=>{
																																																																														var instidirecprog = 'SELECT programName, departmentName, schoolName FROM institution_program JOIN program ON institution_program.programId = program.programId JOIN department ON institution_program.departmentId = department.departmentId JOIN school ON institution_program.schoolId = school.schoolId WHERE institution_program.institutionId = '+result[0].institutionId+'';
																																																																														if(err){
																																																																															console.log("Faculty count per school error");
																																																																														}else{
																																																																															console.log("Faculty count per school success");

																																																																															db.query(instidirecprog,(err,directorprogram)=>{
																																																																																if(err){
																																																																																	console.log("Director program data error");
																																																																																}else{
																																																																																	console.log("Director program success");
																																																																																	var d = new Date();
																																																																																	var doc = new pdf();

																																																																																	//Institution admin school data pdf
																																																																																	doc.pipe(fs.createWriteStream("reports/2/School.pdf"));
																																																																																	doc.font("Times-Roman");
																																																																																	doc.fontSize("12");

																																																																																	var str = "SCHOOL DATA\n\n SCHOOL NAME /  SCHOOL DEAN";

																																																																																	schooldatatable.forEach(function(data){
																																																																																		str += "\n - "+data.schoolName+" / "+data.lname+","+data.fname;
																																																																																	});

																																																																																	str += "\n\n Printed on "+ d.toDateString();

																																																																																	doc.text(str, 100,100);
																																																																																	doc.end();

																																																																																	//Institution admin department data pdf
																																																																																	var doc = new pdf();
																																																																																	doc.pipe(fs.createWriteStream("reports/2/Department.pdf"));
																																																																																	doc.font("Times-Roman");
																																																																																	doc.fontSize("12");

																																																																																	var str = "\n\nLIST OF DEPARTMENTS\n\n DEPARTMENT NAME / CHAIRMAN";

																																																																																	departmenttables.forEach(function(data){
																																																																																		str += "\n - "+data.departmentName+" / "+data.lname+","+data.fname;
																																																																																	});

																																																																																	str += "\n\n Printed on "+ d.toDateString();

																																																																																	doc.text(str, 100,100);
																																																																																	doc.end();

																																																																																	//Institution admin faculty data pdf

																																																																																	var doc = new pdf();
																																																																																	doc.pipe(fs.createWriteStream("reports/2/Faculty.pdf"));
																																																																																	doc.font("Times-Roman");
																																																																																	doc.fontSize("12");

																																																																																	var str = "\n\nFACULTY DATA\n\n SCHOOL NAME / FACULTY NAME / POSITION";

																																																																																	listfaculty.forEach(function(data){
																																																																																		str += "\n - "+data.schoolName+" / "+data.lname+","+data.fname+" / "+data.position;
																																																																																	});

																																																																																	str += "\n\n Printed on "+ d.toDateString();

																																																																																	doc.text(str, 100,100);
																																																																																	doc.end();

																																																																																	//Institution admin program data

																																																																																	var doc = new pdf();
																																																																																	doc.pipe(fs.createWriteStream("reports/2/Program.pdf"));
																																																																																	doc.font("Times-Roman");
																																																																																	doc.fontSize("12");

																																																																																	var str = "\n\PROGRAM DATA\n\n PROGRAM NAME";

																																																																																	directorprogram.forEach(function(data){
																																																																																		str += "\n - "+data.programName;
																																																																																	});



																																																																																	str += "\n\n Printed on "+ d.toDateString();

																																																																																	doc.text(str, 100,100);
																																																																																	doc.end();
																																																																																	res.render("directormenu", {directorprogram:directorprogram,facultyperschool:facultyperschool,averageofprograms:averageofprograms,countofprograms:countofprograms,facultyresearch:facultyresearch,facultybook:facultybook,facultyjournal:facultyjournal,facagegrp:facagegrp, listfaculty: listfaculty,departmenttables: departmenttables,schooldatatable: schooldatatable, dataprogram: dataprogram, depexcellence: depexcellence,depdevelopment: depdevelopment,facavedepartment: facavedepartment, facaveschool: facaveschool, studentenrollee: studentenrollee, facultydirectorcount: facultydirectorcount, facultygender: facultygender, facultyage: facultyage, facultyspecialization: facultyspecialization, facultygraduate: facultygraduate, result: result, data: data, directorfaculty: directorfaculty, facultycount: facultycount, schoolcount: schoolcount, departmentcount: departmentcount, programcount: programcount, booker: booker, journaler: journaler, researcher: researcher, penbooker: penbooker, penjournaler: penjournaler, penresearcher: penresearcher, category:category, journalcategory: journalcategory, researchcategory: researchcategory, thesiscategory: thesiscategory } );
																																																																																}
																																																																															})

																																																																															}
																																																																													})
																																																																													}
																																																																											})
																																																																											}
																																																																									})
																																																																									}
																																																																							});
																																																																							console.log("category res  found");
																																																																						}
																																																																					});
																																																																					console.log("journal category  found");
																																																																				}
																																																																			});
																																																				
																																																																			console.log("Pending books  found");
																																																																		}
																																																																	});
																																																																	console.log("Faculty research success");
																																																																	}
																																																															});
																																																															}
																																																													})
																																																												}
																																																											})
																																																											}
																																																									})
																																																									}
																																																							});
																																																							console.log("Pending journal  found");
																																																						}
																																																					});
																																																					console.log("Pending books  found");
																																																				}
																																																			});
																																																			console.log("Approved research found");
																																																		}
																																																	});
																																																	console.log("Approved journals  found");
																																																}
																																															});
																																															console.log("Approved books found");
																																														}
																																													});
																																													console.log("Faculty list data tables success");
																																												}
																																											});
																																										}
																																									});
																																								}
																																							});
																																							}
																																					});
																																					}
																																			});
																																			}
																																	});
																																}
																															});
																															}
																													});
																												}
																											});
																										}
																									});
																								}
																							});
																						}
																					});
																				}
																			});
																		}
																	});
																	}
															});
														}
													});
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
	}else{
		res.redirect("/");
	}
});

app.get("/dean", function(req, res){

	var fault = req.query.fault;
	switch(fault){
		default: res.locals.message= "Success";break;
	}
	if(req.session.schoolId != null && req.session.accessLevel == 3){
		var sql = 'SELECT  institution_school.schoolId AS schoolId, deanId, schoolName, institution_school.institutionId AS institutionId FROM institution_school JOIN school ON institution_school.schoolId = school.schoolId WHERE institutionId = "'+ req.session.institutionId+'" AND  deanId = "'+req.session.userId+'"';
		db.query(sql, (err, result) => {
				if(err || result[0] == null){
					console.log("School data retrieval error");
				}else{
					var query = 'SELECT facultyId, educationalAttainment, specialization, schoolGraduated, fname, lname, mname, position, yearGraduated, email, institution_school.schoolId AS schoolId, deanId, schoolName, facultyId FROM faculty LEFT JOIN institution_school ON faculty.schoolId = institution_school.schoolId JOIN school ON institution_school.schoolId = school.schoolId WHERE institution_school.schoolId = "'+result[0].schoolId+'" AND institution_school.institutionId = '+result[0].institutionId+' AND faculty.facultyId = '+req.session.userId+' AND faculty.accessLevel = "3"';
					db.query(query, (err, data) => {
						var verificationSql = "SELECT facultyId, fname, lname, mname, email FROM faculty WHERE verificationLevel = 4";
						if(err){
							console.log("School Dean data retrieval error");
						}else{
							console.log("School Dean data retrieval success");

							db.query(verificationSql, (err, unverifiedAccounts) => {									
								var deanfacultyData = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, DATE_FORMAT(dateHired,"%M %d %Y") as dateHired, email FROM faculty WHERE schoolId = '+result[0].schoolId+' AND accesslevel > "3"';
								if(err){
									console.log("For verification accounts retrieval error");
								}else{
									console.log("For verification accounts retrieval success");


									db.query(deanfacultyData, (err,deanfaculty) => {
										var countfaculty = 'SELECT COUNT(facultyId) as facultynumber FROM faculty WHERE accessLevel > "3" AND schoolId = "'+ result[0].schoolId+'" AND institutionId = "'+result[0].institutionId+'"';
										if(err){
											console.log("Dean faculty data retrieval error");
										}else{
											console.log("Dean faculty data retrieval success");

											db.query(countfaculty, (err, facultycount) => {
												console.log(countfaculty);
												var countdepartment = "SELECT COUNT(institution_department.departmentId) as Department, departmentName FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId WHERE schoolId = "+result[0].schoolId+" AND institutionId = "+result[0].institutionId+" GROUP BY departmentName ";
												if (err) {

													console.log("Faculty count error");
												} else {
													console.log("Faculty count success");

													db.query(countdepartment , (err, departmentcount) => {
														var countProgram ="SELECT COUNT(institution_program.programId) as Program FROM institution_program JOIN program ON institution_program.programId = program.programId LEFT JOIN institution_department ON institution_program.departmentId = institution_department.departmentId LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId WHERE institution_school.schoolId = " + result[0].schoolId+ " AND institution_school.institutionId = "+result[0].institutionId+" ";
														if (err) {
															console.log("Department count error");
														} else {
															console.log("Department count success");

															db.query(countProgram, (err, programcount) => {
																var name ="SELECT institutionName, institution.institutionId FROM institution_school LEFT JOIN institution ON institution_school.institutionId = institution.institutionId WHERE institution_school.schoolId = "+ result[0].schoolId +" AND institution_school.institutionId = "+result[0].institutionId+" ";
																if (err) {
																	console.log("Program count error");
																} else {
																	console.log("Program count success");

																	db.query(name, (err,institutename) => {
																		if (err) {
																			console.log("Institution name error");
																		} else {
																			console.log("Institution name success");

																			var facultyJournal = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, journal.title AS journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume AS journalVolume, journal.journalVerificationLevel FROM faculty LEFT JOIN faculty_journal ON faculty_journal.facultyId = faculty.facultyId LEFT JOIN journal ON journal.journalId = faculty_journal.journalId WHERE schoolId = '+ result[0].schoolId +' AND institutionId = '+result[0].institutionId+' AND accesslevel > "3" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, journal.title AS journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume AS journalVolume, journal.journalVerificationLevel FROM journal LEFT JOIN faculty_journal ON faculty_journal.journalId = journal.journalId LEFT JOIN faculty ON faculty.facultyId = faculty_journal.facultyId WHERE schoolId = '+ result[0].schoolId +' AND institutionId = '+result[0].institutionId+' AND accesslevel > "3"';

																			db.query(facultyJournal, (err, facultyJournal) => {
																				if(err){
																						console.log("Dean faculty journal data retrieval error");
																				}else{
																						console.log("Dean faculty journal data retrieval success");

																						var facultyResearch = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description AS researchDescription, research.coresearchers, research.researchVerificationLevel FROM faculty LEFT JOIN faculty_research ON faculty_research.facultyId = faculty.facultyId LEFT JOIN research ON research.researchId = faculty_research.researchId WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' AND accesslevel > "3" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description AS researchDescription, research.coresearchers, research.researchVerificationLevel FROM research LEFT JOIN faculty_research ON faculty_research.researchId = research.researchId LEFT JOIN faculty ON faculty.facultyId = faculty_research.facultyId WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' AND accesslevel > "3"';

																						db.query(facultyResearch, (err, facultyResearch) => {
																							if(err){
																								console.log("Dean faculty research data retrieval error");
																							}else{
																								console.log("Dean faculty research data retrieval success");
																								
																								var facultyBook = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM faculty  LEFT JOIN faculty_book on faculty_book.facultyId = faculty.facultyId LEFT JOIN book on book.bookId = faculty_book.bookId WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' AND accessLevel > "3" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM book LEFT JOIN faculty_book on faculty_book.bookId = book.bookId LEFT JOIN faculty on faculty.facultyId = faculty_book.facultyId WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' AND accessLevel > "3"';
																								
																								db.query(facultyBook, (err,facultyBook) => {

																									var schoolfac = 'SELECT COUNT(facultyId) as FacultyLevel, position FROM faculty WHERE accessLevel > "3" AND schoolId= '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' GROUP BY accessLevel';
																									if(err){
																										console.log("faculty book data retrieval error");
																									}else{
																										console.log("faculty book data retrieval success");

																										db.query(schoolfac, (err, facultyschool) => {
																											var schoolgraduate = 'SELECT COUNT(facultyId) as FacultyGraduate, schoolGraduated FROM faculty WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' GROUP BY schoolGraduated'
																											if(err){
																											console.log(schoolfac);
																												console.log("School Faculty retrieval error");
																											}else{
																												console.log("School Faculty retrieval success");

																												db.query(schoolgraduate, (err, facultygraduate) => {
																													var facspecial = 'SELECT COUNT(facultyId) as FacultySpecialization, specialization FROM faculty WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' GROUP BY specialization';
																													if(err){
																														console.log("School graduate error");
																													}else{
																														console.log("School gradute success");

																														db.query(facspecial, (err,facspecialization) => {

																															var facage = 'SELECT SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 20 AND 30 THEN 1 ELSE 0 END) AS "twentyTothirty", SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 30 AND 40 THEN 1 ELSE 0 END) AS "thirtyToforty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 40 AND 50 THEN 1 ELSE 0 END) AS "fortyTofifty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 50 AND 60 THEN 1 ELSE 0 END) AS "fiftyTosixty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 60 AND 70 THEN 1 ELSE 0 END) AS "sixtyToseventy",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 70 AND 80 THEN 1 ELSE 0 END) AS "seventyToeighty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 80 AND 90 THEN 1 ELSE 0 END) AS "eightyToninety" FROM faculty WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+'';
																															if(err){
																																console.log("Faculty Specialization retrieval error");
																															}else{
																																	console.log("Faculty Specialization retrieval success");


																																	db.query(facage, (err, facultyage) => {
																																		var gender = 'SELECT COUNT(facultyId) as FacGender, gender FROM faculty WHERE schoolId = '+result[0].schoolId+' AND institutionId = '+result[0].institutionId+' GROUP BY gender';
																																		if(err){
																																			console.log("Faculty age error");
																																		}else{
																																			console.log("Faculty age success");

																																			db.query(gender, (err,facultygender)=> {
																																				var enrollee = 'SELECT SUM(enrollees) enrollees, SUM(graduated) as graduated, year,department.departmentName,institution.institutionName FROM studentdata JOIN department ON studentdata.departmentId = department.departmentId JOIN institution ON studentdata.institutionId = institution.institutionId WHERE studentdata.schoolId = '+result[0].schoolId+' AND studentdata.institutionId = '+result[0].institutionId+' GROUP BY year';
																																				if(err){
																																					console.log("Faculty gender error");
																																				}else{
																																					console.log("Faculty gender success");

																																					db.query(enrollee, (err,studentenrollee) => {
																																					var books = 'SELECT  book.bookId,category, book.title, book.ISBN, book.edition, book.year, faculty_book.facultyId AS value1, faculty_book.bookId AS value2 FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"  AND bookVerificationLevel = "1"' ;
																																						if(err){
																																							console.log("Student enrollee and graduated error.");
																																						}else{
																																							console.log("Student enrollee and graduated success.");

																																							db.query(books, (err,books) => {
																																							var journals = 'SELECT  journal.journalId,category, title,link, year, volume, faculty_journal.facultyId AS value1, faculty_journal.journalId AS value2 FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND journalVerificationLevel = "1"';
																																								if(err){
																																									console.log("Books not retrieved");
																																								}else{
																																									db.query(journals, (err,journals) => {
																																										var researches = 'SELECT  research.researchId, category,year,research.name,research.status, research.collaborations, research.description, research.coresearchers,faculty_research.facultyId AS value1, faculty_research.researchId AS value2 FROM research JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND researchVerificationLevel = "1"';
																																										if(err){
																																											console.log("Journals not retrived");
																																										}else{
																																											db.query(researches, (err,researches) => {
																																													var totalprog = 'SELECT COUNT(institution_program.programId) as totalprogram, departmentName FROM institution_program LEFT JOIN institution_department ON institution_program.departmentId = institution_department.departmentId JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId WHERE institution_school.schoolId = '+result[0].schoolId+' AND institution_school.institutionId = '+result[0].institutionId+' GROUP BY departmentName';
																																												if(err){
																																													console.log("Reseach not retrieved");
																																												}else{
																																													console.log("Research retrieved");

																																													db.query(totalprog, (err,programtotal) => {
																																														var progdata = 'SELECT DISTINCT programName, departmentName FROM institution_program JOIN program ON institution_program.programId = program.programId LEFT JOIN institution_department ON institution_program.departmentId = institution_department.departmentId JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId WHERE institution_school.schoolId = '+result[0].schoolId+' AND institution_school.institutionId = '+result[0].institutionId+' ';
																																														if(err){
																																															console.log("Program total count error");
																																														}else{
																																															console.log("Program total count success");

																																															db.query(progdata,(err,schoolprogram) =>{
																																																var deptTables = 'select fname, lname, departmentName FROM faculty LEFT JOIN institution_department ON faculty.facultyId = institution_department.chairmanId JOIN department ON institution_department.departmentId = department.departmentId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND accessLevel = "4"';
																																																if(err){
																																																	console.log("School Program data retrieval error");
																																																}else{
																																																	console.log("School Program data retrieval success");

																																																	db.query(deptTables, (err,departmentschoolTables) => {
																																																		var depDevelopment = 'SELECT COUNT(departmentId) as centerOfDevelopment FROM institution_department LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId WHERE centerOfDevelopment = "Certified" AND institution_school.schoolId = '+result[0].schoolId+' AND institution_school.institutionId = '+result[0].institutionId+'';
																																																		if(err){
																																																			console.log("Department data tables error");
																																																		}else{
																																																			console.log("Department data tables success");

																																																			db.query(depDevelopment, (err, departmentcenterdevelopment) => {
																																																				var depExcellence = 'SELECT COUNT(departmentId) as centerOfExcellence FROM institution_department LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId WHERE centerOfExcellence = "Certified" AND institution_school.schoolId = '+result[0].schoolId+' AND institution_school.institutionId = '+result[0].institutionId+'';
																																																				if(err){
																																																					console.log("Department center of development retrieval error");
																																																				}else{
																																																					console.log("Department center of development retrieval success");

																																																					db.query(depExcellence, (err,departmentcenterExcellence) =>{
																																																						var facultylist = 'SELECT  faculty.facultyId as facultyId,departmentName,fname, lname, position FROM faculty LEFT JOIN department ON faculty.departmentId = department.departmentId LEFT JOIN school ON faculty.schoolId = school.schoolId WHERE faculty.schoolId = '+result[0].schoolId+' AND faculty.institutionId = '+result[0].institutionId+' AND accessLevel >= "4"';
																																																						if(err){
																																																							console.log("Department Center of exceellence retrieval error");
																																																						}else{
																																																							console.log("Department Center of exceellence retrieval success");

																																																							db.query(facultylist,(err,listoffaculty) => {
																																																								var penbooks = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																								if(err){
																																																									console.log("Faculty data tables retrieval error");
																																																								}else{
																																																								db.query(penbooks,(err,penbooks) => {
																																																									var penjournals = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, lname, fname, faculty.facultyId FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																									if(err){
																																																										console.log("Pending won books not found");
																																																									}else{
																																																									db.query(penjournals,(err,penjournals) => {
																																																										var penresearch = 'SELECT research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, faculty.lname, faculty.fname, faculty.facultyId FROM `research` JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																										if(err){
																																																											console.log("Journals pending not found");
																																																										}else{
																																																											db.query(penresearch,(err,penresearch) => {
																																																												var category = 'SELECT book.category, COUNT(book.bookId) AS number FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE  faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND bookVerificationLevel =1 AND denyStatus =0  GROUP by book.category';
																																																												if(err){
																																																													console.log("Pending research not found");
																																																												}else{
																																																													db.query(category, (err,category) => {
																																																														var journalcategory = 'SELECT journal.category, COUNT(journal.journalId) AS number FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND faculty.schoolId = '+result[0].schoolId+' AND journalVerificationLevel =1 AND journalDenyStatus =0 GROUP by journal.category'
																																																														if(err){
																																																															console.log("Books caegory not found");
																																																														}else{
																																																															db.query(journalcategory, (err,journalcategory) => {
																																																																var researchcategory = 'SELECT research.category, COUNT(research.researchId) AS number FROM research JOIN faculty_research ON faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND faculty.schoolId = '+result[0].schoolId+' AND researchVerificationLevel =1 AND reserchDenyStatus =0 GROUP by research.category';
																																																																if(err){
																																																																	console.log("category journal not found");
																																																																}else{
																																																																	db.query(researchcategory, (err,researchcategory) => {
																																																																		var thesiscategory = 'SELECT thesis.topic, COUNT(thesis.topic) AS number FROM thesis JOIN faculty_thesis ON faculty_thesis.thesisId= thesis.thesisId JOIN faculty ON faculty_thesis.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND faculty.schoolId = '+result[0].schoolId+' GROUP by thesis.topic';
																																																																		if(err){
																																																																			console.log("Pending books not found");
																																																																		}else{
																																																																			db.query(thesiscategory, (err,thesiscategory) => {
																																																																				var allbooks = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' and faculty.schoolId = '+result[0].schoolId+'';
																																																																				if(err){
																																																																					console.log("Pending books not found");
																																																																				}else{
																																																																					db.query(allbooks, (err,allbooks) => {
																																																																						var alljournals = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, fname, lname FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.institutionId ='+result[0].institutionId+'  and faculty.schoolId = '+result[0].schoolId+'';
																																																																						if(err){
																																																																							console.log("all books not found");
																																																																						}else{
																																																																							db.query(alljournals, (err,alljournals) => {
																																																																								var allresearch = 'SELECT  research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, fname, lname FROM `research` JOIN faculty_research ON faculty_research.researchId=research.researchId JOIN faculty ON faculty_research.facultyId= faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+'';
																																																																								if(err){
																																																																									console.log("all res not found");
																																																																								}else{
																																																																									db.query(allresearch, (err,allresearch) => {
																																																																										var allthesis = 'SELECT thesis.thesisId, faculty.facultyId, `title`, DATE_FORMAT(dateDefended,"%M %d %Y") as dateDefended, `publicationStatus`, `topic`, `student_author`, fname, lname FROM `thesis` JOIN faculty_thesis ON faculty_thesis.thesisId=thesis.thesisId JOIN faculty ON faculty_thesis.facultyId= faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+'';
																																																																										if(err){
																																																																											console.log("all thesis not found");
																																																																										}else{
																																																																											db.query(allthesis, (err,allthesis) => {
																																																																												var countofprog = 'SELECT department.departmentName as depName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' AND institution_program.schoolId = '+result[0].schoolId+' GROUP BY institution_program.departmentId'
																																																																												if(err){
																																																																													console.log("thesis all not found");
																																																																												}else{
																																																																													console.log("all thesis  found");

																																																																													db.query(countofprog,(err,countofprograms)=>{
																																																																														var aveofprog = 'SELECT AVG(temp) as avetemp FROM (SELECT department.departmentName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' AND institution_program.schoolId = '+result[0].schoolId+' GROUP BY institution_program.departmentId) AS A'
																																																																														if(err){
																																																																															console.log("Program count error");
																																																																														}else{
																																																																															console.log("Program count success");

																																																																															db.query(aveofprog,(err,averageofprograms)=>{
																																																																																var presentation = 'SELECT presentation.presentationId,presentationName,paperName,presentation.date,presentation.presentVerificationLevel, presentation.presentDenyStatus, faculty_presentation.facultyId AS value1, faculty_presentation.presentationId AS value2 FROM presentation JOIN faculty_presentation ON faculty_presentation.presentationId = presentation.presentationId JOIN faculty ON faculty.facultyId = faculty_presentation.facultyId WHERE faculty.facultyId = '+data[0].facultyId+' AND presentation.presentVerificationLevel = "1" AND presentation.presentDenyStatus = 0';
																																																																																if(err){
																																																																																	console.log("Program average error");
																																																																																}else{
																																																																																	db.query(presentation, (err,presentation) => {
																																																																																		var pendingpres = 'SELECT presentation.presentationId, `presentationName`, `paperName`, DATE_FORMAT(date, "%M %d %Y") as date, `presentVerificationLevel`, `presentDenyStatus` FROM `presentation` JOIN faculty_presentation ON faculty_presentation.presentationId=presentation.presentationId JOIN faculty ON faculty_presentation.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																																																		if(err){
																																																																																			console.log("my presentation not found");
																																																																																		}else{
																																																																																			db.query(pendingpres, (err,pendingpres) => {
																																																																																				var progschooldata = 'SELECT institution.institutionId, programName, SUM(population) as population, year,availability FROM programdata JOIN program ON programdata.programId = program.programId JOIN institution ON programdata.institutionId = institution.institutionId WHERE programdata.institutionId = '+result[0].institutionId+' AND programdata.schoolId = '+result[0].schoolId+' GROUP BY year ORDER BY year ASC'
																																																																																				if(err){
																																																																																					console.log("Pending presentation not found");
																																																																																				}else{

																																																																																				db.query(progschooldata,(err,programschooldata)=>{
																																																																																					var countfacdep = 'SELECT COUNT(faculty.facultyId) as facultyId, departmentName,institutionName FROM faculty JOIN department ON faculty.departmentId = department.departmentId JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.schoolId = '+result[0].schoolId+' AND faculty.institutionId = '+result[0].institutionId+' GROUP BY departmentName'
																																																																																					if(err){
																																																																																						console.log("Program school data error");
																																																																																					}else{
																																																																																						console.log("Program school data success");

																																																																																						db.query(countfacdep,(err,departmentcountfac)=>{
																																																																																							if(err){
																																																																																								console.log("Faculty count per department error");
																																																																																							}else{
																																																																																								console.log("Faculty count per department error");

																																																																																								var d = new Date();
																																																																																								var doc = new pdf();
																																																																																								//School Dean department Data PDF
																																																																																								doc.pipe(fs.createWriteStream("reports/3/Department.pdf"));
																																																																																								doc.font("Times-Roman");
																																																																																								doc.fontSize("12");
																																																																																									
																																																																																								var str = "DEPARTMENT DATA\n\n DEPARTMENT NAME / DEPARTMENT CHAIRMAN";
																																																																																								
																																																																																								departmentschoolTables.forEach(function(data){
																																																																																									str += "\n- " + data.departmentName +" / "+ data.lname +", "+ data.fname;
																																																																																								});
																																																																																								str += "\n\n Printed on " + d.toDateString();
																																																																																								
																																																																																								doc.text(str, 100, 100);
																																																																																								doc.end();

																																																																																								//School Dean faculty data pdf
																																																																																								var doc = new pdf();

																																																																																								doc.pipe(fs.createWriteStream("reports/3/Faculty.pdf"));
																																																																																								doc.font("Times-Roman");
																																																																																								doc.fontSize("12");

																																																																																								var str = "FACULTY DATA\n\ FACULTY NAME / POSITION";

																																																																																								listoffaculty.forEach(function(data){
																																																																																									str += "\n- "+ data.lname+","+data.fname+" / "+data.position;
																																																																																								});

																																																																																								str += "\n\n Printed on " + d.toDateString();
																																																																																								
																																																																																								doc.text(str, 100, 100);
																																																																																								doc.end();

																																																																																								//School dean program data pdf	
																																																																																								var doc = new pdf();

																																																																																								doc.pipe(fs.createWriteStream("reports/3/Program.pdf"));
																																																																																								doc.font("Times-Roman");
																																																																																								doc.fontSize("12");

																																																																																								var str = "PROGRAM DATA\n\DEPARTMENT NAME / PROGRAM NAME";

																																																																																								schoolprogram.forEach(function(data){
																																																																																									str += "\n- "+data.programName;
																																																																																								});

																																																																																								str += "\n\n Printed on " + d.toDateString();
																																																																																								
																																																																																								doc.text(str, 100, 100);
																																																																																								doc.end();

																																																																																								res.render("deanmenu", { departmentcountfac:departmentcountfac,programschooldata:programschooldata,averageofprograms:averageofprograms,countofprograms:countofprograms, listoffaculty: listoffaculty, departmentcenterExcellence: departmentcenterExcellence,departmentcenterdevelopment: departmentcenterdevelopment, departmentschoolTables: departmentschoolTables,schoolprogram: schoolprogram, programtotal: programtotal, studentenrollee: studentenrollee, facultygender: facultygender, facultyage: facultyage, facspecialization: facspecialization, facultyBook:facultyBook, facultyResearch: facultyResearch, facultyJournal: facultyJournal, facultyschool: facultyschool, result: result, data: data, unverifiedAccounts: unverifiedAccounts, deanfaculty: deanfaculty, facultycount: facultycount, departmentcount: departmentcount, programcount: programcount, institutename: institutename, facultygraduate: facultygraduate, books: books, journals:journals, researches:researches,penbooks: penbooks, penjournals: penjournals, penresearch: penresearch, category: category, journalcategory: journalcategory, researchcategory: researchcategory, thesiscategory: thesiscategory, allbooks: allbooks,alljournals: alljournals, allresearch: allresearch, allthesis: allthesis, presentation: presentation, pendingpres: pendingpres} );
																																																																																							}
																																																																																						})
																																																																																					}
																																																																																				});
																																																																																				console.log("Pending presentation  found");
																																																																																				}
																																																																																			});
																																																																																			console.log("my presentation  found");
																																																																																		}
																																																																																	});
																																																																																	console.log("Program average success");
																																																																																	}
																																																																															})
																																																																															}
																																																																													})
																																																																													}
																																																																											});
																																																																											console.log("Pending books  found");
																																																																										}
																																																																									});
																																																																									console.log("Pending books  found");
																																																																								}
																																																																							});
																																																																							console.log("all books  found");
																																																																						}
																																																																					});
																																																																					console.log("Pending books  found");
																																																																				}
																																																																			});
																																																																			console.log("Pending books  found");
																																																																		}
																																																																	});
																																																																	console.log("category journal  found");
																																																																}
																																																															});
																																																															console.log("Books category  found");
																																																														}
																																																													});
																																																													console.log("Pending Research found");
																																																												}
																																																											});
																																																											console.log("Journals pending found");
																																																										}
																																																									});
																																																										console.log("Pending books found");
																																																									}

																																																								});
																																																									console.log("Faculty data table retrieval success");
																																																								}
																																																							});
																																																						}
																																																					});
																																																				}
																																																			});
																																																		}
																																																	});
																																																	}
																																															});
																																														}
																																													});
																																													}
																																											});
																																											console.log("Journals retrieved");																																										
																																											}
																																									});
																																									console.log("Books retrieved");																																								
																																								}
																																							});
																																							console.log("Student enrollee and graudated success");
																																																																					
																																						}
																																					});
																																				}
																																			});
																																		}
																																	});
																															}
																														});
																													}
																												});
																												}
																									});
																									}
																								});
																								
																								

																							}
																						});


																				}
																			});

																	}
																	});
																}
															});
														}
													});
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
	}else{
		res.redirect("/");
	}
});

app.get("/deptchair", function(req, res){

	var fault = req.query.fault;
	switch(fault){
		default: res.locals.message= "Success";break;
	}
	if(req.session.depId != null && req.session.accessLevel == 4){
		var sql = "SELECT institution_department.departmentId AS departmentId, schoolId, institutionId, departmentName, chairmanId, centerOfDevelopment, centerOfExcellence FROM institution_department JOIN department ON institution_department.departmentId = department.departmentId WHERE institution_department.departmentId = "+req.session.depId+" AND institution_department.institutionId = "+req.session.institutionId+" AND institution_department.chairmanId = "+req.session.userId+"";

		db.query(sql, (err, result) => {
				if(err || result[0] == null){
					console.log("Department data retrieval error");
				}else{
					var query = "SELECT educationalAttainment, specialization, schoolGraduated, institution_department.departmentId AS departmentId, institution_department.schoolId, chairmanId,position, email, yearGraduated, departmentName, institution_school.schoolId AS schoolId, deanId, schoolName, facultyId, fname, lname, mname, facultyId FROM faculty LEFT JOIN institution_department ON faculty.departmentId = institution_department.departmentId JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution_school ON institution_school.schoolId = institution_department.schoolId JOIN school ON institution_school.schoolId = school.schoolId WHERE institution_department.departmentId = "+ result[0].departmentId+" AND institution_department.institutionId = "+result[0].institutionId+" AND institution_department.schoolId = "+result[0].schoolId+" AND faculty.facultyId = "+req.session.userId+"";

					db.query(query, (err, data) => {
						if(err){
							console.log("Department Head data retrieval error");
						}else{
							console.log("Department Head data retrieval success");

							var verificationSql = "SELECT facultyId, fname, lname, mname, email FROM faculty WHERE verificationLevel = 5";

							db.query(verificationSql, (err, unverifiedAccounts) => {
								if(err){
									console.log("For verification accounts retrieval error");
								}else{
									console.log("For verification accounts retrieval success");

									var departmentfacultyData = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, DATE_FORMAT(dateHired,"%M %d %Y") as dateHired, email FROM faculty WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accesslevel = "5"';

									db.query(departmentfacultyData, (err, departmentfaculty) => {
										var countfaculty = 'SELECT department.departmentName as depName, COUNT(faculty.facultyId) as facId FROM department JOIN faculty ON faculty.departmentId = department.departmentId WHERE faculty.institutionId = '+result[0].institutionId+' GROUP BY faculty.departmentId';
										if(err){
											console.log("Department Faculty data error");
										}else{
											console.log("Department faculty data success");

											db.query(countfaculty, (err, facultycount) => {
												var countProgram ="SELECT COUNT(programId) as Program FROM institution_program LEFT JOIN institution_department ON institution_program.departmentId = institution_department.departmentId WHERE institution_department.departmentId = "+ result[0].departmentId+" AND institution_department.institutionId = "+result[0].institutionId+" AND institution_department.schoolId = "+result[0].schoolId+"";
												if (err) {
													console.log("Faculty degree count error");
												} else {
													console.log("Faculty degree count success");

													db.query(countProgram, (err, programcount) => {
															var name= "SELECT institution.institutionName, institution.institutionId FROM institution_department LEFT JOIN institution ON institution.institutionId = institution_department.institutionId WHERE institution_department.departmentId = "+ result[0].departmentId+" AND institution_department.institutionId = "+result[0].institutionId+" AND institution_department.schoolId = "+result[0].schoolId+"";
														if (err) {
															console.log("Program count error");
														} else {
															console.log("Program count success");

															db.query(name, (err,institutename) => {
																var unverifiedBooks = 'SELECT  book.bookId,book.category, book.title, book.ISBN, book.edition, book.year, faculty.fname, faculty.lname FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.departmentId = "'+data[0].departmentId+'" AND faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND bookVerificationLevel = "0" AND denyStatus = "0"' ;
																if (err) {
																	console.log("Institution name error");
																} else {
																	console.log("Institution name success");

																	db.query(unverifiedBooks, (err, book) => {
																		var unverifiedJournals = 'SELECT  journal.journalId, fname, lname, category, title,link, year, volume FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.departmentId = "'+data[0].departmentId+'" AND faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND journalVerificationLevel = "0" and journalDenyStatus ="0"'
																		if (err) {
																			console.log("Data Collection failed");
																		}else{
																			console.log("Data Collection success");

																			db.query(unverifiedJournals, (err, journal) => {
																				var unverifiedResearch = 'SELECT  research.researchId,category,year,fname, lname, research.name,research.status, research.collaborations, research.description, research.coresearchers FROM research JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.departmentId = "'+data[0].departmentId+'" AND faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND researchVerificationLevel = "0" and reserchDenyStatus = "0"';
																				if (err) {
																					console.log("journal data retrieval failed!");
																				}else{
																					console.log("journal data retrieval success!");

																					db.query(unverifiedResearch, (err, research) => {
																						if (err) {
																							console.log("Reseach data info retrival failed!");
																						}else{
																							console.log("Research data successfully Retrieved!");

																							var facultyJournal = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, journal.title AS journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume AS journalVolume, journal.journalVerificationLevel FROM faculty LEFT JOIN faculty_journal ON faculty_journal.facultyId = faculty.facultyId LEFT JOIN journal ON journal.journalId = faculty_journal.journalId WHERE departmentId = '+ result[0].departmentId +' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accesslevel = "5" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, journal.title AS journalTitle, journal.link AS journalLink, journal.year AS journalYear, journal.volume AS journalVolume, journal.journalVerificationLevel FROM journal LEFT JOIN faculty_journal ON faculty_journal.journalId = journal.journalId LEFT JOIN faculty ON faculty.facultyId = faculty_journal.facultyId WHERE departmentId = '+ result[0].departmentId +' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accesslevel = "5"';

																							db.query(facultyJournal, (err, facultyJournal) => {
																								if(err){
																									console.log("dept journal error");
																								}else{
																									console.log("dept journal success");

																									var facultyResearch = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description AS researchDescription, research.coresearchers, research.researchVerificationLevel FROM faculty LEFT JOIN faculty_research ON faculty_research.facultyId = faculty.facultyId LEFT JOIN research ON research.researchId = faculty_research.researchId WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accesslevel = "5" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, research.name AS researchName, research.status AS researchStatus, research.collaborations, research.description AS researchDescription, research.coresearchers, research.researchVerificationLevel FROM research LEFT JOIN faculty_research ON faculty_research.researchId = research. researchId LEFT JOIN faculty ON faculty.facultyId = faculty_research.facultyId WHERE departmentId= '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accesslevel = "5"';
																								
																									db.query(facultyResearch, (err, facultyResearch) => {
																										if(err){
																											console.log("dept research error");
																										}else{
																											console.log("dept research success");

																											var facultyBook = 'SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM faculty  LEFT JOIN faculty_book on faculty_book.facultyId = faculty.facultyId LEFT JOIN book on book.bookId = faculty_book.bookId WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accessLevel = "5" UNION SELECT faculty.facultyId, fname, lname, mname, position, educationalAttainment, yearGraduated, schoolGraduated, gender, dateOfBirth, facultyType, specialization, dateHired, email, book.title AS bookTitle, ISBN, book.edition AS bookEdition, book.year AS bookYear, bookVerificationLevel FROM book LEFT JOIN faculty_book on faculty_book.bookId = book.bookId LEFT JOIN faculty on faculty.facultyId = faculty_book.facultyId WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accessLevel = "5"';
																											
																											db.query(facultyBook, (err, facultyBook) => {
																												var genderfac = 'SELECT COUNT(facultyId) as Facgender, gender, fname FROM faculty WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' and accessLevel > "4" GROUP BY gender';
																												if(err){
																													console.log("faculty book data retrieval error");
																												}else{
																													console.log("faculty book data retrieval success");


																													db.query(genderfac, (err,facultygender) => {

																														var facspecial = 'SELECT COUNT(facultyId) as Facspecial, specialization FROM faculty WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accessLevel > "4" GROUP BY specialization';
																														if(err){
																															console.log("Faculty gender count error");
																														}else{
																															console.log("Faculty gender count success");

																															db.query(facspecial, (err,specializationfaculty)=> {
																																var facgraduate = 'SELECT COUNT(facultyId) as facgraduate, schoolGraduated FROM faculty WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accessLevel > "4" GROUP BY schoolGraduated'
																																if(err){
																																	console.log("Faculty specialization count error");
																																}else{
																																	console.log("Faculty specialization count success");

																																	db.query(facgraduate, (err, facschoolgraduated) => {

																																		var faccount = 'SELECT COUNT(facultyId) as fac FROM faculty WHERE departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accessLevel > "4" '
																																		if(err){
																																			console.log("School graduated count success");
																																		}else{
																																			console.log("School graduated count success");

																																			db.query(faccount, (err,countfaculty) => {
																																			var books = 'SELECT  book.bookId,book.category, book.title, book.ISBN, book.edition, book.year, faculty_book.facultyId AS value1, faculty_book.bookId AS value2 FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND bookVerificationLevel = "1"' ;
																																				
																																				if(err){
																																					console.log("Faculty count error");
																																				}else{
																																					console.log("Faculty count success");

																																				db.query(books, (err,books) => {
																																					var journals = 'SELECT  journal.journalId,category, title,link, year, volume, faculty_journal.facultyId AS value1, faculty_journal.journalId AS value2 FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND journalVerificationLevel = "1"';
																																					if(err){
																																						console.log("Books not retrieved");
																																					}else{
																																						console.log("Books retrieved");

																																						db.query(journals, (err,journals) => {
																																							var researches = 'SELECT  research.researchId,research.category, research.name,research.status, research.collaborations, research.description, research.coresearchers,faculty_research.facultyId AS value1, faculty_research.researchId AS value2 FROM research JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'" AND researchVerificationLevel = "1"';
																																							if(err){
																																								console.log("Journals not retrived");
																																							}else{
																																								console.log("Journals retrived");

																																								db.query(researches, (err,researches) => {
																																									var enrollee = 'SELECT SUM(enrollees) as enrollees, SUM(graduated) as graduated, departmentName, schoolName, institutionName,year FROM studentdata JOIN department ON studentdata.departmentId = department.departmentId JOIN school ON studentdata.schoolId = school.schoolId JOIN institution ON studentdata.institutionId = institution.institutionId WHERE studentdata.departmentId = '+result[0].departmentId+' AND studentdata.schoolId = '+result[0].schoolId+' AND studentdata.institutionId = '+result[0].institutionId+' GROUP BY year';
																																									if(err){
																																										console.log("Reseaches not retrieved");
																																									}else{
																																										console.log("Research retrieved");

																																										db.query(enrollee,(err,studentenrollee) => {
																																										var progdata = 'SELECT institution.institutionId, programName, SUM(population) as population, year,availability FROM programdata JOIN program ON programdata.programId = program.programId JOIN institution ON programdata.institutionId = institution.institutionId WHERE programdata.institutionId = '+result[0].institutionId+' AND programdata.departmentId = '+result[0].departmentId+' GROUP BY year ORDER BY year ASC';
																																											if(err){
																																												console.log("Student enrollee and graduated retrieval error");
																																											}else{
																																												console.log("Student enrollee and graduated retrieval success");

																																												db.query(progdata, (err,deptprogram) => {
																																													var facultytables = 'SELECT  faculty.facultyId as facultyId,fname, lname, position FROM faculty JOIN department ON faculty.departmentId = department.departmentId WHERE department.departmentId = '+result[0].departmentId+' AND institutionId = '+result[0].institutionId+' AND schoolId = '+result[0].schoolId+' AND accessLevel = "5"';
																																													if(err){
																																														console.log("Department Program retrieval error");
																																													}else{
																																														console.log("Department Program retrieval success");

																																														db.query(facultytables, (err,facultydatatables) => {
																																														var fat = 'SELECT  fname, lname, facultyId FROM faculty WHERE institutionId = '+result[0].institutionId+' and departmentId = '+result[0].departmentId+'';
																																															if(err){
																																																console.log("Faculty data tables retrieval error");
																																															}else{
																																																db.query(fat, (err,fat) => {
																																																var fat2 = 'SELECT  thesis.thesisId, thesis.title,thesis.dateDefended, thesis.publicationStatus, thesis.topic, thesis.student_author, faculty.fname, faculty.lname, faculty_thesis.facultyId AS value1, faculty_thesis.thesisId AS value2 FROM thesis JOIN faculty_thesis ON faculty_thesis.thesisId = thesis.thesisId JOIN faculty ON faculty_thesis.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'';
																																																	if(err){
																																																		console.log("Faculties not found");
																																																	}else{
																																																	db.query(fat2, (err,fat2) =>{
																																																		var pendbooks = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																		if(err){
																																																			console.log("Error in retrieving thesis data");
																																																		}else{
																																																		db.query(pendbooks,(err,pendbooks) =>{
																																																			var pendjournals = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, lname, fname, faculty.facultyId FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																			if(err){
																																																				console.log("failed to find pending books");
																																																			}else{
																																																				db.query(pendjournals,(err,pendjournals) =>{
																																																					var pendresearch = 'SELECT research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, faculty.lname, faculty.fname, faculty.facultyId FROM `research` JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																					if(err){
																																																						console.log("Pending journals not found");
																																																					}else{
																																																						db.query(pendresearch,(err,pendresearch) =>{
																																																							//var category = 'SELECT (SELECT COUNT(book.bookId) as art FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Arts and Music" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as art,(SELECT COUNT(book.bookId) as bio FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Biographies" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as bio, (SELECT COUNT(book.bookId) as bus FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Business" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as bus ,(SELECT COUNT(book.bookId) as com FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Computers and Technology" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as comp,(SELECT COUNT(book.bookId) as art FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Cooking" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as cook,(SELECT COUNT(book.bookId) as educ FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Educational and References" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as educ,(SELECT COUNT(book.bookId) as health FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Health and Fitness" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as health, (SELECT COUNT(book.bookId) as lit FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Literature" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as lit,(SELECT COUNT(book.bookId) as med FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Medical" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as med,(SELECT COUNT(book.bookId) as soc FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Social Science" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as soc,(SELECT COUNT(book.bookId) as religion FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Religion" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as religion,(SELECT COUNT(book.bookId) as science FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Science and Math" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as science,(SELECT COUNT(book.bookId) as others FROM book  JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE category = "Others" AND faculty.schoolId= "'+result[0].schoolId+'" AND faculty.institutionId ="'+result[0].institutionId+'") as others from DUAL'; 
																																																							var category = 'SELECT book.category, COUNT(book.bookId) AS number FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE  faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+result[0].departmentId+' AND bookVerificationLevel =1 AND denyStatus =0  GROUP by book.category';
																																																							if(err){
																																																								console.log("Pending research not found");
																																																							}else{
																																																								db.query(category, (err,category) => {
																																																								var journalcategory = 'SELECT journal.category, COUNT(journal.journalId) AS number FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND faculty.departmentId = '+result[0].departmentId+' AND journalVerificationLevel =1 AND journalDenyStatus =0 GROUP by journal.category'
																																																									if(err){
																																																										console.log("Pending category not found");
																																																									}else{
																																																									db.query(journalcategory, (err,journalcategory) => {
																																																										var researchcategory = 'SELECT research.category, COUNT(research.researchId) AS number FROM research JOIN faculty_research ON faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND faculty.departmentId = '+result[0].departmentId+' AND researchVerificationLevel =1 AND reserchDenyStatus =0 GROUP by research.category';
																																																										if(err){
																																																											console.log("Journal category not found");
																																																										}else{
																																																											db.query(researchcategory, (err,researchcategory) => {
																																																												var depfacave = 'SELECT AVG(temp) AS AverageNumbeOfFaculty FROM (SELECT COUNT(faculty.facultyId) AS temp FROM department JOIN faculty ON faculty.departmentId = department.departmentId WHERE faculty.institutionId = '+result[0].institutionId+' GROUP BY faculty.departmentId) AS A';
																																																												if(err){
																																																													console.log("research catefory not found");
																																																												}else{
																																																													console.log(researchcategory);
																																																													console.log("research category  found");

																																																													db.query(depfacave,(err,facavedep)=>{
																																																														var progavedep = 'SELECT AVG(temp) as avetemp FROM (SELECT department.departmentName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' AND institution_program.departmentId = '+result[0].departmentId+' GROUP BY institution_program.departmentId) AS A';
																																																														if(err){
																																																															console.log("Faculty average error");
																																																														}else{
																																																															console.log("Faculty average success");

																																																															db.query(progavedep,(err,programdepave)=>{
																																																																var progdepcount = 'SELECT department.departmentName as depName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' AND institution_program.departmentId = '+result[0].departmentId+' GROUP BY institution_program.departmentId'
																																																																if(err){
																																																																	console.log("Department Program error");
																																																																}else{
																																																																	console.log("Department program success");

																																																																	db.query(progdepcount,(err,depprogramcount)=>{
																																																																		var thesiscategory = 'SELECT thesis.topic, COUNT(thesis.topic) AS number FROM thesis JOIN faculty_thesis ON faculty_thesis.thesisId= thesis.thesisId JOIN faculty ON faculty_thesis.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+'  AND faculty.departmentId = '+result[0].departmentId+' GROUP by thesis.topic';
																																																																		if(err){
																																																																			console.log("Program department error");
																																																																		}else{
																																																																			db.query(thesiscategory, (err,thesiscategory) => {
																																																																				var allbooks = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' and faculty.departmentId = '+result[0].departmentId+'';
																																																																				if(err){
																																																																					console.log("Pending books not found");
																																																																				}else{
																																																																					db.query(allbooks, (err,allbooks) => {
																																																																						var alljournals = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, fname, lname FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.institutionId ='+result[0].institutionId+'  and faculty.departmentId = '+result[0].departmentId+'';
																																																																						if(err){
																																																																							console.log("all books not found");
																																																																						}else{
																																																																							db.query(alljournals, (err,alljournals) => {
																																																																							var allresearch = 'SELECT  research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, fname, lname FROM `research` JOIN faculty_research ON faculty_research.researchId=research.researchId JOIN faculty ON faculty_research.facultyId= faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+result[0].departmentId+'';
																																																																								if(err){
																																																																									console.log("all journals not found");
																																																																								}else{
																																																																									db.query(allresearch, (err,allresearch) => {
																																																																										var allthesis = 'SELECT thesis.thesisId, faculty.facultyId, `title`, DATE_FORMAT(dateDefended,"%M %d %Y") as dateDefended, `publicationStatus`, `topic`, `student_author`, fname, lname FROM `thesis` JOIN faculty_thesis ON faculty_thesis.thesisId=thesis.thesisId JOIN faculty ON faculty_thesis.facultyId= faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+result[0].departmentId+'';
																																																																										if(err){
																																																																											console.log("all research not found");
																																																																										}else{
																																																																											db.query(allthesis, (err,allthesis) => {
																																																																												var denybooks = 'SELECT  book.bookId,book.category, book.title, book.ISBN, book.edition, book.year, faculty.fname, faculty.lname FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.departmentId = "'+data[0].departmentId+'" AND faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND bookVerificationLevel = "0" AND denyStatus = "1"' ;
																																																																												if(err){
																																																																													console.log("all thesis not found");
																																																																												}else{
																																																																													db.query(denybooks, (err,denybooks) => {
																																																																														var denyjournals = 'SELECT  journal.journalId, fname, lname, category, title,link, year, volume FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.departmentId = "'+data[0].departmentId+'" AND faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND journalVerificationLevel = "0" and journalDenyStatus ="1"'
																																																																														if(err){
																																																																															console.log("deny books not found");
																																																																														}else{
																																																																															db.query(denyjournals, (err,denyjournals) => {
																																																																																var denyresearch = 'SELECT  research.researchId,category,year,fname, lname, research.name,research.status, research.collaborations, research.description, research.coresearchers FROM research JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.departmentId = "'+data[0].departmentId+'" AND faculty.institutionId = '+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' AND researchVerificationLevel = "0" and reserchDenyStatus = "1"';
																																																																																if(err){
																																																																																	console.log("Pending books not found");
																																																																																}else{
																																																																																	db.query(denyresearch, (err,denyresearch) => {
																																																																																		var bookstatus = 'SELECT (SELECT COUNT(book.bookId) FROM `book` JOIN faculty_book on faculty_book.bookId= book.bookId JOIN faculty ON faculty_book.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND book.bookVerificationLevel = 1 AND denyStatus = 0) as available, (SELECT COUNT(book.bookId) FROM `book` JOIN faculty_book on faculty_book.bookId= book.bookId JOIN faculty ON faculty_book.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND book.bookVerificationLevel = 0 AND denyStatus = 1) as denied, (SELECT COUNT(book.bookId) FROM `book` JOIN faculty_book on faculty_book.bookId= book.bookId JOIN faculty ON faculty_book.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND book.bookVerificationLevel = 0 AND denyStatus = 0) as pending FROM DUAL';
																																																																																		if(err){
																																																																																			console.log("deny research not found");
																																																																																		}else{
																																																																																			db.query(bookstatus, (err,bookstatus) => {
																																																																																				var journalstatus = 'SELECT (SELECT COUNT(journal.journalId) FROM `journal` JOIN faculty_journal on faculty_journal.journalId= journal.journalId JOIN faculty ON faculty_journal.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND journal.journalVerificationLevel = 1 AND journal.journalDenyStatus = 0) as available,(SELECT COUNT(journal.journalId) FROM `journal` JOIN faculty_journal on faculty_journal.journalId= journal.journalId JOIN faculty ON faculty_journal.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND journal.journalVerificationLevel = 0 AND journal.journalDenyStatus = 0) as pending, (SELECT COUNT(journal.journalId) FROM `journal` JOIN faculty_journal on faculty_journal.journalId= journal.journalId JOIN faculty ON faculty_journal.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND journal.journalVerificationLevel = 0 AND journal.journalDenyStatus = 1) as denied from DUAL';
																																																																																				console.log(bookstatus);
																																																																																				if(err){
																																																																																					console.log("Pending books not found");
																																																																																				}else{
																																																																																					db.query(journalstatus, (err,journalstatus) => {
																																																																																						var researchstatus = 'SELECT (SELECT COUNT(research.researchId) FROM `research` JOIN faculty_research on faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND research.researchVerificationLevel = 1 AND research.reserchDenyStatus = 0) as available, (SELECT COUNT(research.researchId) FROM `research` JOIN faculty_research on faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND research.researchVerificationLevel = 0 AND research.reserchDenyStatus = 0) as pending,(SELECT COUNT(research.researchId) FROM `research` JOIN faculty_research on faculty_research.researchId= research.researchId JOIN faculty ON faculty_research.facultyId=faculty.facultyId WHERE faculty.institutionId="'+result[0].institutionId+'" AND faculty.departmentId = "'+data[0].departmentId+'" AND research.researchVerificationLevel = 0 AND research.reserchDenyStatus = 1) as denied FROM DUAL';
																																																																																						console.log(journalstatus);
																																																																																						if(err){
																																																																																							console.log("status journal not found");
																																																																																						}else{
																																																																																							db.query(researchstatus, (err,researchstatus) => {
																																																																																								 var unverifiedPres = 'SELECT presentation.presentationId, `presentationName`, `paperName`, DATE_FORMAT(date, "%M %d %Y") as date, `presentVerificationLevel`, `presentDenyStatus`, fname, lname FROM `presentation` JOIN faculty_presentation ON faculty_presentation.presentationId=presentation.presentationId JOIN faculty ON faculty_presentation.facultyId = faculty.facultyId WHERE faculty.institutionId ='+result[0].institutionId+' AND faculty.schoolId = '+result[0].schoolId+' and faculty.departmentId = "'+data[0].departmentId+'" AND presentVerificationLevel  =0 AND presentDenyStatus = 0';
																																																																																								console.log(researchstatus);
																																																																																								if(err){
																																																																																									console.log("res status  not found");
																																																																																								}else{
																																																																																									db.query(unverifiedPres, (err,unverifiedPres) => {
																																																																																										var presentation = 'SELECT presentation.presentationId,presentationName,paperName,presentation.date,presentation.presentVerificationLevel, presentation.presentDenyStatus, faculty_presentation.facultyId AS value1, faculty_presentation.presentationId AS value2 FROM presentation JOIN faculty_presentation ON faculty_presentation.presentationId = presentation.presentationId JOIN faculty ON faculty.facultyId = faculty_presentation.facultyId WHERE faculty.facultyId = '+data[0].facultyId+' AND presentation.presentVerificationLevel = "1" AND presentation.presentDenyStatus = 0';
																																																																																										if(err){
																																																																																											console.log("Pending presentation not found");
																																																																																										}else{
																																																																																											db.query(presentation, (err,presentation) => {
																																																																																												var pendingpres = 'SELECT presentation.presentationId, `presentationName`, `paperName`, `date`, `presentVerificationLevel`, `presentDenyStatus` FROM `presentation` JOIN faculty_presentation ON faculty_presentation.presentationId=presentation.presentationId JOIN faculty ON faculty_presentation.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+data[0].facultyId+'"';
																																																																																												if(err){
																																																																																													console.log(" test not found");
																																																																																												}else{
																																																																																													db.query(pendingpres, (err,pendingpres) => {
																																																																																														var allpres = 'SELECT presentation.presentationId, `presentationName`, `paperName`, DATE_FORMAT(date, "%M %d %Y") as date, `presentVerificationLevel`, `presentDenyStatus`, fname,lname FROM `presentation` JOIN faculty_presentation ON faculty_presentation.presentationId=presentation.presentationId JOIN faculty ON faculty_presentation.facultyId=faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+data[0].departmentId+'';
																																																																																														if(err){
																																																																																															console.log("my presentation not found");
																																																																																														}else{
																																																																																															db.query(allpres, (err,allpres) => {
																																																																																																var facdeg = 'select COUNT(faculty.facultyId) as fac,educationalAttainment FROM faculty JOIN institution ON faculty.institutionId = institution.institutionId JOIN department ON faculty.departmentId = department.departmentId WHERE department.departmentId = '+result[0].departmentId+' AND institution.institutionId = '+result[0].institutionId+' GROUP BY educationalAttainment';
																																																																																																if(err){
																																																																																																	console.log("all presentation not found");
																																																																																																}else{

																																																																																																db.query(facdeg,(err,facultydegree)=>{
																																																																																																	var facage = 'SELECT SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 20 AND 30 THEN 1 ELSE 0 END) AS "twentyTothirty", SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 30 AND 40 THEN 1 ELSE 0 END) AS "thirtyToforty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 40 AND 50 THEN 1 ELSE 0 END) AS "fortyTofifty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 50 AND 60 THEN 1 ELSE 0 END) AS "fiftyTosixty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 60 AND 70 THEN 1 ELSE 0 END) AS "sixtyToseventy",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 70 AND 80 THEN 1 ELSE 0 END) AS "seventyToeighty",SUM(CASE WHEN YEAR(NOW())- YEAR(dateOfBirth) BETWEEN 80 AND 90 THEN 1 ELSE 0 END) AS "eightyToninety" FROM faculty WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId ='+result[0].departmentId+'';
																																																																																																	if(err){
																																																																																																		console.log("Faculty degree error");
																																																																																																	}else{
																																																																																																		console.log("Faculty degree success");

																																																																																																		db.query(facage,(err,facultyagerange)=>{
																																																																																																			var deptprograms = 'SELECT departmentName, programName,description FROM program JOIN institution_program ON program.programId = institution_program.programId LEFT JOIN department ON institution_program.departmentId = department.departmentId WHERE institution_program.departmentId = '+result[0].departmentId+'';
																																																																																																			if(err){
																																																																																																				console.log("Faculty age range error");
																																																																																																			}else{
																																																																																																				console.log("Faculty age range success");

																																																																																																				db.query(deptprograms,(err,programdepartment)=>{
																																																																																																					if(err){
																																																																																																						console.log("Department program error");
																																																																																																					}else{
																																																																																																						console.log("Department program success");
																																																																																																				

																																																																																																				var d = new Date();

																																																																																																				//Department chair faculty data pdf
																																																																																																				var doc = new pdf();

																																																																																																				doc.pipe(fs.createWriteStream("reports/4/Faculty.pdf"));
																																																																																																				doc.font("Times-Roman");
																																																																																																				doc.fontSize("12");

																																																																																																				var str = "FACULTY DATA\n\n FACULTY NAME / POSITION";

																																																																																																				facultydatatables.forEach(function(data){
																																																																																																					str += "\n- "+ data.lname+","+data.fname+" / "+data.position;
																																																																																																				});

																																																																																																				str += "\n\n Printed on " + d.toDateString();
																																																																																																				
																																																																																																				doc.text(str, 100, 100);
																																																																																																				doc.end();

																																																																																																				//Department chair program data pdf	
																																																																																																				var doc = new pdf();

																																																																																																				doc.pipe(fs.createWriteStream("reports/4/Program.pdf"));
																																																																																																				doc.font("Times-Roman");
																																																																																																				doc.fontSize("12");

																																																																																																				var str = "PROGRAM DATA\n\DEPARTMENT NAME / PROGRAM NAME";

																																																																																																				programdepartment.forEach(function(data){
																																																																																																					str += "\n- "+data.programName;
																																																																																																				});

																																																																																																				str += "\n\n Printed on " + d.toDateString();
																																																																																																				
																																																																																																				doc.text(str, 100, 100);
																																																																																																				doc.end();
																																																																																																				res.render("deptChair", {programdepartment:programdepartment,facultyagerange:facultyagerange,facultydegree:facultydegree,depprogramcount:depprogramcount,programdepave:programdepave,facavedep:facavedep,facultydatatables: facultydatatables, deptprogram: deptprogram, studentenrollee: studentenrollee, facultyBook: facultyBook, facultyJournal: facultyJournal, countfaculty: countfaculty, facschoolgraduated: facschoolgraduated, specializationfaculty: specializationfaculty, facultygender: facultygender, facultyResearch: facultyResearch, result: result, data: data, unverifiedAccounts: unverifiedAccounts, departmentfaculty: departmentfaculty, facultycount: facultycount, programcount: programcount, institutename: institutename, book: book, journal: journal, research: research, books:books, journals: journals, researches: researches, fat: fat, fat2 : fat2, pendbooks: pendbooks, pendjournals: pendjournals, pendresearch: pendresearch, category: category, journalcategory: journalcategory, researchcategory: researchcategory, thesiscategory: thesiscategory, allbooks: allbooks, alljournals: alljournals, allresearch: allresearch, allthesis: allthesis, denybooks:denybooks, denyjournals: denyjournals, denyresearch: denyresearch, bookstatus: bookstatus, journalstatus: journalstatus, researchstatus: researchstatus, unverifiedPres: unverifiedPres, presentation: presentation, pendingpres: pendingpres,allpres: allpres} );
																																																																																																					}
																																																																																																				})
																																																																																																			}
																																																																																																		})
																																																																																																		}
																																																																																																})
																																																																																																	console.log("all presentation  found");
																																																																																																}
																																																																																															});
																																																																																															console.log("my presentation  found");
																																																																																														}
																																																																																													});
																																																																																													console.log(" presentation  found");
																																																																																												}
																																																																																											});
																																																																																											console.log("Pending presentation  found");
																																																																																										}
																																																																																									});
																																																																																									console.log("res status  found");
																																																																																								}
																																																																																							});
																																																																																							console.log("status journal  found");
																																																																																						}
																																																																																					});
																																																																																					console.log("Pending books  found");
																																																																																				}
																																																																																			});
																																																																																			console.log("deny research  found");
																																																																																		}
																																																																																	});
																																																																																	console.log("Pending books  found");
																																																																																}
																																																																															});
																																																																															console.log("deny books  found");
																																																																														}
																																																																													});
																																																																													console.log("allthesis thesis  found");
																																																																												}
																																																																											});
																																																																											console.log("all research  found");
																																																																										}
																																																																									});
																																																																									console.log("all journals  found");
																																																																								}
																																																																							});
																																																																							console.log("Pending books  found");
																																																																						}
																																																																					});
																																																																					console.log("Pending books  found");
																																																																				}
																																																																			});
																																																																			console.log("Program department success");
																																																																		}
																																																																	})
																																																																	}
																																																															})
																																																															}
																																																													})
																																																													}
																																																											});
																																																											console.log(journalcategory);
																																																											console.log("Journal category  found");
																																																										}
																																																									});
																																																									console.log(category);
																																																									console.log("Pending category  found");
																																																									}
																																																								});
																																																								console.log("Pending research found");
																																																							}
																																																						});
																																																						console.log("Pending journals found");
																																																						
																																																					}
																																																				});
																																																				console.log("Foud pending books");
																																																				
																																																			}
																																																		});
																																																			console.log("Thesis found success");

																																																		}

																																																	});
																																																		console.log("Faculties found");
																																																	}
																																																});
																																																console.log("Faculty data tables retrieval success");
																																															
																																															}
																																														});
																																														}
																																												});
																																												}
																																										});
																																										}
																																								});
																																								console.log("Journals retrieved");
																																							}
																																						});
																																						console.log("Books successfully retrieved");
																																					}

																																				});
																																					console.log("Faculty count success");																			
																																				}
																																			});
																																		}
																																	});
																																}
																															});
																														}
																													});
																													}
																											});
																											
																											
																						
																										}
																								});
																								}
																							});

																					    }
																					});
																					console.log("journal data retrieval successful!");
																				}
																			});
																			console.log("Data Collection successful");
																		}
																	});
																	console.log("Institution name success");
																}
															});
														}
													});
												}
											});
										}
									});

								}
							});
						}
					});
				}
			});
	}else{
		res.redirect("/");
	}
});


app.get("/faculty", function(req, res){

	var fault = req.query.fault;
	switch(fault){
		default: res.locals.message= "Success";break;
	}
	
	if(req.session.userId != null && req.session.accessLevel == 5){
		var sql = "SELECT * FROM faculty WHERE facultyId = " + req.session.userId;

		db.query(sql, (err, result) => {
				if(err || result[0] == null){
					console.log("data retrieval error");
				}else{
					var query = "SELECT institution.institutionId, institution.institutionName, school.schoolName, department.departmentName, faculty.facultyId,fname, lname, mname, position, yearGraduated, email, educationalAttainment, faculty.accessLevel FROM faculty LEFT JOIN institution_department ON faculty.departmentId = institution_department.departmentId LEFT JOIN department ON institution_department.departmentId = department.departmentId LEFT JOIN institution_school ON institution_department.schoolId = institution_school.schoolId LEFT JOIN school ON school.schoolId = institution_school.schoolId  LEFT JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.facultyId = "+ result[0].facultyId;

					db.query(query, (err, data) => {
						var countProgram ="SELECT COUNT(institution_program.programId) as Program FROM institution_program LEFT JOIN institution_department ON institution_program.departmentId = institution_department.departmentId WHERE institution_department.departmentId = "+result[0].departmentId+" AND institution_department.institutionId = "+result[0].institutionId+" AND institution_department.schoolId = "+result[0].schoolId+" ";
						
						if(err){
							console.log("Faculty data retrieval error");
						}else{
							console.log("Faculty retrieval success");
							db.query(countProgram, (err, programcount) => {
								var books = 'SELECT book.bookId,category, book.title, book.ISBN, book.edition, book.year, faculty_book.facultyId AS value1, faculty_book.bookId AS value2 FROM book JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty.facultyId = faculty_book.facultyId WHERE faculty.facultyId = '+result[0].facultyId+' AND bookVerificationLevel = "1" AND denyStatus = 0';
								console.log(books);
								if (err) {
									console.log("Program count error");
								} else {
									console.log("Program count success.");

									db.query(books, (err, books) => {
										var journals = 'SELECT  journal.journalId,category, title,link, year, volume, faculty_journal.facultyId AS value1, faculty_journal.journalId AS value2 FROM journal JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = '+result[0].facultyId+' AND journalVerificationLevel = "1" and journalDenyStatus = 0';
										if (err) {
											console.log("Book not Retrieved");
										}else{
											db.query(journals, (err, journals) => {
												var research = 'SELECT  research.researchId,category,year, research.name,research.status, research.collaborations, research.description, research.coresearchers,faculty_research.facultyId AS value1, faculty_research.researchId AS value2 FROM research JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = '+result[0].facultyId+' AND researchVerificationLevel = "1" and reserchDenyStatus = 0';
												if (err) {
													console.log("Journals not Retrieved");
												}else{
													db.query(research, (err, research) => {
														var studdata = 'SELECT DISTINCT year,enrollees, graduated FROM studentdata WHERE studentdata.departmentId = '+result[0].departmentId+' AND studentdata.institutionId = '+result[0].institutionId+'';
														if (err) {
															console.log("Research not Retrieved");
														}else{
															console.log("Research successfully Retrieved");

															db.query(studdata,(err,dataofstud) => {
																var progdept = 'SELECT programName, year, SUM(population) as population,availability FROM programdata JOIN program ON programdata.programId = program.programId JOIN department ON programdata.departmentId = department.departmentId JOIN institution ON programdata.institutionId = institution.institutionId WHERE programdata.departmentId = '+result[0].departmentId+' AND institution.institutionId = '+result[0].institutionId+' AND programdata.schoolId = '+result[0].schoolId+' GROUP BY year ORDER BY year ASC';
																if(err){
																	console.log("Faculty student data retrieval error");
																}else{
																	console.log("Faculty student data retrieval success");
																		console.log(progdept);
																	db.query(progdept, (err,programdepartment) => {
																		var pendingboks = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+result[0].facultyId+'"';
																		if(err){

																			console.log("Program department retrieval error");
																		}else{
																			db.query(pendingboks, (err, pendingboks) =>{
																				var pendingjournals = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, lname, fname, faculty.facultyId FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+result[0].facultyId+'"';
																				if (err) {
																					console.log("Did not find own books");
																				}else{
																					db.query(pendingjournals, (err, pendingjournals)=>{
																						var pendingresearch = 'SELECT research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, faculty.lname, faculty.fname, faculty.facultyId FROM `research` JOIN faculty_research ON faculty_research.researchId = research.researchId JOIN faculty ON faculty_research.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+result[0].facultyId+'"';
																						if (err) {
																							console.log("Own pending journals not found");
																						}else{
																							db.query(pendingresearch, (err, pendingresearch)=>{
																								var studgraph = 'SELECT SUM(enrollees) as enrollees, SUM(graduated) as graduated, departmentName, schoolName, institutionName,year FROM studentdata JOIN department ON studentdata.departmentId = department.departmentId JOIN school ON studentdata.schoolId = school.schoolId JOIN institution ON studentdata.institutionId = institution.institutionId WHERE studentdata.departmentId = '+result[0].departmentId+' AND studentdata.schoolId = '+result[0].schoolId+' AND studentdata.institutionId = '+result[0].institutionId+' GROUP BY year';
																								if (err) {
																									console.log("Own  pending research not found");
																								}else{
																									console.log("Found own research pending");

																									db.query(studgraph,(err,studentgraph)=>{
																										var prog = 'SELECT department.departmentName as depName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' AND institution_program.departmentId = '+result[0].departmentId+' GROUP BY institution_program.departmentId';
																										if(err){
																											console.log("Student graph error");
																										}else{
																											console.log("Student graph success");

																											db.query(prog,(err,progcount)=>{
																												var progave = 'SELECT AVG(temp) as avetemp FROM (SELECT department.departmentName, COUNT(institution_program.programId) AS temp FROM institution_program JOIN institution ON institution.institutionId = institution_program.institutionId JOIN department ON department.departmentId = institution_program.departmentId WHERE institution_program.institutionId = '+result[0].institutionId+' AND institution_program.departmentId = '+result[0].departmentId+' GROUP BY institution_program.departmentId) AS A';
																												if(err){
																													console.log("Program count error");
																												}else{
																													console.log("Program count success");

																													db.query(progave,(err,programave)=>{
																														var allbooks = 'SELECT book.bookId, `title`, `ISBN`, `edition`, `year`, `category`, `bookVerificationLevel`, `denyStatus`, faculty.fname, faculty.lname, faculty.facultyId FROM `book` JOIN faculty_book ON faculty_book.bookId = book.bookId JOIN faculty ON faculty_book.facultyId = faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' and faculty.departmentId = '+result[0].departmentId+' and bookVerificationLevel = 1 and denyStatus = 0';
																														if(err){
																															console.log("Program average error");
																														}else{
																															db.query(allbooks, (err,allbooks) => {
																																var alljournals = 'SELECT journal.journalId, `title`, `link`, `year`, `volume`, `category`, `journalVerificationLevel`, `journalDenyStatus`, fname, lname FROM `journal` JOIN faculty_journal ON faculty_journal.journalId = journal.journalId JOIN faculty ON faculty_journal.facultyId = faculty.facultyId WHERE faculty.institutionId ='+result[0].institutionId+'  and faculty.departmentId = '+result[0].departmentId+' and journalVerificationLevel = 1 and journalDenyStatus =0';
																																if(err){
																																	console.log("all books not found");
																																}else{
																																	db.query(alljournals, (err,alljournals) => {
																																		var allresearch = 'SELECT  research.researchId, `name`, `status`, `collaborations`, `description`, `coresearchers`, `category`, `year`, `researchVerificationLevel`, `reserchDenyStatus`, fname, lname FROM `research` JOIN faculty_research ON faculty_research.researchId=research.researchId JOIN faculty ON faculty_research.facultyId= faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+result[0].departmentId+' AND researchVerificationLevel =1 AND reserchDenyStatus = 0';
																																		if(err){
																																			console.log("Pending books not found");
																																		}else{
																																			db.query(allresearch, (err,allresearch) => {
																																				var allthesis = 'SELECT thesis.thesisId, faculty.facultyId, `title`, DATE_FORMAT(dateDefended,"%M %d %Y") as dateDefended, `publicationStatus`, `topic`, `student_author`, fname, lname FROM `thesis` JOIN faculty_thesis ON faculty_thesis.thesisId=thesis.thesisId JOIN faculty ON faculty_thesis.facultyId= faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+result[0].departmentId+'';
																																				if(err){
																																					console.log("all research not found");
																																				}else{
																																					db.query(allthesis, (err,allthesis) => {
																																						var presentation = 'SELECT presentation.presentationId,presentationName,paperName,presentation.date,presentation.presentVerificationLevel, presentation.presentDenyStatus, faculty_presentation.facultyId AS value1, faculty_presentation.presentationId AS value2 FROM presentation JOIN faculty_presentation ON faculty_presentation.presentationId = presentation.presentationId JOIN faculty ON faculty.facultyId = faculty_presentation.facultyId WHERE faculty.facultyId = '+result[0].facultyId+' AND presentation.presentVerificationLevel = "1" AND presentation.presentDenyStatus = 0';
																																						if(err){
																																							console.log("all thesis not found");
																																						}else{
																																							db.query(presentation, (err,presentation) => {
																																								var pendingpres = 'SELECT presentation.presentationId, `presentationName`, `paperName`, `date`, `presentVerificationLevel`, `presentDenyStatus` FROM `presentation` JOIN faculty_presentation ON faculty_presentation.presentationId=presentation.presentationId JOIN faculty ON faculty_presentation.facultyId = faculty.facultyId WHERE faculty.facultyId = "'+result[0].facultyId+'"';
																																								if(err){
																																									console.log(" presentation not found");
																																								}else{
																																									db.query(pendingpres, (err,pendingpres) => {
																																										var allpres = 'SELECT presentation.presentationId, `presentationName`, `paperName`, DATE_FORMAT(date, "%M %d %Y") as date, `presentVerificationLevel`, `presentDenyStatus`, fname,lname FROM `presentation` JOIN faculty_presentation ON faculty_presentation.presentationId=presentation.presentationId JOIN faculty ON faculty_presentation.facultyId=faculty.facultyId WHERE faculty.institutionId = '+result[0].institutionId+' AND faculty.departmentId = '+result[0].departmentId+' AND presentation.presentVerificationLevel =1 AND presentation.presentDenyStatus=0';
																																										if(err){
																																											console.log("Pending presentation not found");
																																										}else{
																																											db.query(allpres, (err,allpres) => {
																																												if(err){
																																													console.log("Pending books not found");
																																												}else{
																																													res.render("faculty", {programave:programave,progcount:progcount,studentgraph:studentgraph, programdepartment: programdepartment, dataofstud: dataofstud,result: result, data: data, programcount: programcount, books: books, journals: journals, research: research, pendingboks: pendingboks, pendingjournals: pendingjournals, pendingresearch: pendingresearch, allbooks: allbooks, alljournals: alljournals, allresearch: allresearch, allthesis: allthesis, presentation: presentation, pendingpres: pendingpres, allpres: allpres } );
																																													console.log("Pending books  found");
																																												}
																																											});
																																											console.log("Pending presentation  found");
																																										}
																																									});
																																									console.log(" presentation  found");
																																								}
																																							});
																																							console.log("allthesis   found");
																																						}
																																							
																																					});
																																					console.log("all research  found");
																																				}
																																			});
																																			console.log("Pending books  found");
																																		}
																																	});
																																	console.log("all books  found");
																																}
																															});
																															console.log("Program average success");
																															}
																													})
																													}
																											})
																											}
																									})
																									}
																							});
																							console.log("Found own pending journals");
																						}
																					});
																					console.log("Found books");
																				}
																			});
																			console.log("Program department retrieval success");
																		
																		}
																	});
																	}
															})
															}
													});
													console.log("Journals successfully Retrieved");
												}
											});
											console.log("Books successfully Retrieved");
										}
									});
									console.log("Program count success");
								}
							});
						}
					});
				}
			});
	}else{
		res.redirect("/");
	}
});



app.post("/addInstitution", function(req, res){
	var institutionName = req.body.institutionName;
	var institutionAddress = req.body.institutionAddress;
	var institutionRegion = req.body.region_id;

	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var position = req.body.position;
	var educationalAttainment = req.body.educationalAttainment;
	var yearGraduated = req.body.yearGraduated;
	var schoolGraduated = req.body.schoolGraduated
	var gender = req.body.gender;
	var dob = req.body.dob;
	var facultyType = req.body.facultyType;
	var programGraduated = req.body.programGraduated;
	var dateHired = req.body.dateHired;
	var email = req.body.email;
	var password = req.body.password;
	var accessLevel = req.body.AccessLevel;

	var sql = 'INSERT INTO institution VALUES (null, null, "'+ institutionName +'", "'+ institutionAddress +'", "'+ institutionRegion +'")';

	var confirm = 'SELECT * FROM institution WHERE institutionName = "'+institutionName+'" ';

		db.query(confirm,(err,find)=>{

			if(find[0] == null){
			db.query(sql, (err, result) => {
				var institutionId = result.insertId;
				var token = crypto.randomBytes(64).toString('hex');
				var newpass = encrypt(password, token);

				var qry = 'INSERT INTO faculty VALUES (null,null,null,"'+institutionId+'","'+fname+'","'+lname+'","'+mname+'","'+position+'","'+educationalAttainment+'","'+yearGraduated+'","'+schoolGraduated+'","'+gender+'","'+dob+'","'+facultyType+'","'+programGraduated+'","'+dateHired+'","'+email+'","'+newpass+'","'+token+'","1", "1")';
				console.log(qry);
				
				if(err){
					console.log("Institution insertion error");
					res.redirect('/ched');
				}else{
					console.log("Institution insertion success");
					
				db.query(qry, (err, faculty) => {
					if(err){
						console.log("Admin insertion error");
						res.redirect('/ched');
					}else{
						console.log("Admin insertion success");
								if(!req.files){
									console.log("No files uploaded");
								}else{
									var profileImage = req.files.institutionLogo;
									var facImage = req.files.profileImage;

									profileImage.mv("public/images/institution"+result.insertId+".jpg", function(err){
										if(err){
											console.log("Institution File upload error");
										}else{
											console.log("Institution File upload success");
											facImage.mv("public/images/faculty"+faculty.insertId+".jpg", function(err){
												if(err){
													console.log("Faculty File upload error");
												}else{
													console.log("Faculty File upload success");
													res.redirect('/ched');
												}
												
											});
										}
									});								
						
							}
				}

				});
				}

			});
			}else{
				console.log("Institution name already exists!");
				res.redirect('/ched?fault=5');
			}
		})
});

app.post("/editInstitution", function(req, res){
	var institutionId = req.body.institutionId;
	var institutionName = req.body.institutionName;
	var institutionAddress = req.body.institutionAddress;
	var institutionRegion = req.body.institutionRegion;

	var sql = 'UPDATE institution SET institutionName = "'+ institutionName +'", address = "'+ institutionAddress +'", region_id = "'+ institutionRegion +'" WHERE institutionId = '+ institutionId +'';

	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Institution update error");
			res.redirect('/admin');
		}else{
			console.log("Institution update success");

			if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.institutionLogo;

						profileImage.mv("public/images/institution"+institutionId+".jpg", function(err){
							if(err){
								console.log("File upload error");
							}else{
								console.log("File upload success");
							}
						});
					}

			res.redirect('/admin');
		}
	});
});

app.post("/editInstitutionChed", function(req, res){
	var institutionId = req.body.institutionId;
	var institutionName = req.body.institutionName;
	var institutionAddress = req.body.institutionAddress;
	var institutionRegion = req.body.institutionRegion;

	var sql = 'UPDATE institution SET institutionName = "'+ institutionName +'", address = "'+ institutionAddress +'", region_id = "'+ institutionRegion +'" WHERE institutionId = '+ institutionId +'';

	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Institution update error");
			res.redirect('/ched');
		}else{
			console.log("Institution update success");

			if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.institutionLogo;

						profileImage.mv("public/images/institution"+institutionId+".jpg", function(err){
							if(err){
								console.log("File upload error");
							}else{
								console.log("File upload success");
							}
						});
					}

			res.redirect('/ched');
		}
	});
});

app.post("/addInstitutionDirector", function(req, res){
	var facultyId = req.body.facultyIdd;
	var institutionId = req.body.institutionId;
	var accLev = 2;
	var toFaculty = 5;

	var sql = 'SELECT faculty.facultyId FROM faculty INNER JOIN institution ON faculty.institutionId = institution.institutionId WHERE faculty.accessLevel = "2" AND institution.directorId = faculty.facultyId AND faculty.institutionId = "'+institutionId+'"';

	db.query(sql, (err, ret) => {
		if(ret[0]!=null){
			var qry = 'UPDATE faculty SET accessLevel = "'+toFaculty+'", position = "Regular Faculty", verificationLevel ="3" WHERE facultyId = "'+ret[0].facultyId+'"';
			db.query(qry, (err,result) => {
				var director = 'UPDATE faculty SET accessLevel = "'+accLev+'", position = "Institution Director", verificationLevel ="2", departmentId = null, schoolId = null  WHERE facultyId = "'+facultyId+'"';
				if(err){
					console.log("Update previous director error.");
				}else{
					console.log("Update previous director success.");

					db.query(director, (err, result) => {
						var institution = 'UPDATE institution SET directorId = "'+facultyId+'" WHERE institutionId = "'+institutionId+'"';

						if(err){
						console.log("Update new director error.");
						}else{
						console.log("Update new director success.");
						db.query(institution,(err,result) => {
							if(err){
								console.log("Institution update error.");
							}else{
								console.log("Institution update success.");
								res.redirect('/admin');
							}
						});
					}
					});
				}

			});
		}else if(err){
			console.log('Select query error.');
		}else if(ret[0] == null){
			var director = 'UPDATE faculty SET accessLevel = "'+accLev+'", position = "Institution Director", verificationLevel ="2", departmentId = null, schoolId = null  WHERE facultyId = "'+facultyId+'"';

				db.query(director, (err, result) => {
					var institution = 'UPDATE institution SET directorId = "'+facultyId+'" WHERE institutionId = "'+institutionId+'"';
				if(err){
					console.log("New institution director update error");
				}else{
					console.log("New institution director update success");

					db.query(institution, (err,result)=>{

						if(err){
							console.log("Institution update error.");
						}else{
							console.log("Institution update success.");
							res.redirect('/admin');
						}
					})
				}

				})
		}
});
});
app.post("/deleteInstitution", function(req, res){
	var institutionId = req.body.institutionId;

	var sql = 'DELETE FROM institution WHERE institutionId = '+ institutionId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Institution deleteion error");
			res.redirect('/ched');
		}else{
			console.log("Institution deletion success");
			res.redirect('/ched');
		}
	});
});

app.post("/addSchool", function(req, res){
	var institutionId = req.body.institutionId;
	var schoolId = req.body.schoolId;

	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var position = req.body.position;
	var educationalAttainment = req.body.educationalAttainment;
	var yearGraduated = req.body.yearGraduated;
	var schoolGraduated = req.body.schoolGraduated
	var gender = req.body.gender;
	var dob = req.body.dob;
	var facultyType = req.body.facultyType;
	var programGraduated = req.body.programGraduated;
	var dateHired = req.body.dateHired;
	var email = req.body.email;
	var password = req.body.password;
	var accessLevel = req.body.AccessLevel;
	var description = req.body.description;

	var sql = 'INSERT INTO institution_school VALUES ("'+ institutionId +'", "'+ schoolId +'" , null,"'+ description +'")';

	console.log(sql);

	db.query(sql, (err, result1) => {
		if(err){
			console.log("School insertion error");
		}else{
		var token = crypto.randomBytes(64).toString('hex');
		var newpass = encrypt(password, token);			

			var sql1 = 'INSERT INTO faculty VALUES (null,null,"'+schoolId+'","'+institutionId+'","'+fname+'","'+lname+'","'+mname+'","'+position+'","'+educationalAttainment+'","'+yearGraduated+'","'+schoolGraduated+'","'+gender+'","'+dob+'","'+facultyType+'","'+programGraduated+'","'+dateHired+'","'+email+'","'+newpass+'","'+token+'", "3", "3")';
			console.log(sql1);

			db.query(sql1, (err, result) => {
				if(err){
					console.log("Faculty insert error");
				}else{
					var latestfaculty = result.insertId;
					console.log(latestfaculty);

					if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.profileImage;

						profileImage.mv("public/images/faculty"+result.insertId+".jpg", function(err){
							if(err){
								console.log("File upload error");
							}else{
								console.log("File upload success");
						
					

						var sql2 = 'UPDATE institution_school SET deanId = "'+ latestfaculty +'" WHERE schoolId = ' + schoolId+' AND institutionId = '+institutionId+' ';
						console.log(sql2);

							db.query(sql2, (err, result2) => {
								if(err){
									console.log("Update school dean failed");
								}else{
									var mailOptions = {
									from: 'chedph01@gmail.com',
									to: email,
									subject: "NOREPLY: CHED Steam Cloud Platform invitation",
									text: 'Hello '+fname+' '+mname+' '+lname+', you can now access the CHED Steam Cloud Platform as School Dean using your Email and this password: "'+password+'". Thank you!'
								};

								transporter.sendMail(mailOptions, function(error, info){
									if (error) {
										console.log(error);
									} else {
										console.log('Email sent: ' + info.response);
									}
								});
									console.log("Update school dean success");
								}
							});
					console.log("Faculty insert success");
						}
						});
				}
				}
			});
			console.log("School insertion success");
			res.redirect("/admin");
		}
	});
});

app.post("/editSchool", function(req, res){
	var institutionId = req.body.institutionId;
	var schoolName = req.body.schoolName;
	var schoolId = req.body.schoolId;

	var sql = 'UPDATE school SET schoolName = "'+ schoolName +'" WHERE schoolId = ' + schoolId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("School update error");
			res.redirect("/ched?fault=1");
		}else{
			console.log("School update success");
			res.redirect("/ched");
		}
	});
})

app.post("/deleteSchool", function(req, res){
	var schoolId = req.body.schoolId;
	
		var qry = 'UPDATE faculty SET accessLevel = "5", verificationLevel = "3", schoolId = null, departmentId = null, position = "Regular Faculty" WHERE schoolId = ' +schoolId;
		if(err){
			console.log("Find school error");
		}else{
			console.log("Find school success");

			db.query(qry, (err, update) => {
				var delInDepartment = 'DELETE FROM institution_department WHERE schoolId = ' +schoolId;

				if(err){
				console.log("Update faculty error");
				}else{
				console.log("Update faculty success");

				db.query(delInDepartment, (err,delInDepartment) => {
					var delq = 'DELETE FROM institution_school WHERE schoolId = ' +schoolId;

					if(err){
					console.log("Delete institution_department error");
					}else{
					console.log("Delete institution_department success");

					db.query(delq, (err, delq) =>{
						var delInSchool = 'DELETE FROM school WHERE schoolId = ' +schoolId;
						if(err){
							console.log("Delete institution_school error.");
						}else{
							console.log("Delete institution_school success.")

							db.query(delInSchool, (err, delInSchool) => {
								if(err){
									console.log("Delete school error.");
								}else{
									console.log("Delete school success.");
									res.redirect('/ched');
								}
							});
						}
					})
				}
				});
			}
			});
		}
	
})

app.post("/addSchoolDean", function(req, res){
	var facultyId = req.body.facultyIdd;
	var institutionId = req.body.institutionId;
	var schoolId = req.body.schoolIdd;
	var accLev = 3;
	var toFaculty = 5;

	var sql ='SELECT faculty.facultyId FROM faculty INNER JOIN institution_school ON faculty.institutionId = institution_school.institutionId WHERE faculty.accessLevel = "3" AND institution_school.deanId = faculty.facultyId AND faculty.schoolId = "'+schoolId+'"';

	db.query(sql,(err, result) => {

		var qry = 'SELECT facultyId FROM faculty WHERE schoolId = "'+schoolId+'" AND facultyId = "'+facultyId+'"';
		if(result[0] == null){
			db.query(qry,(err, find) => {

				var update = 'UPDATE faculty SET accessLevel = "3", verificationLevel = "3", departmentId = null, position = "School Dean" WHERE facultyId = "'+facultyId+'"';
				if(find[0] != null){
					var update2 = 'UPDATE institution_school SET deanId ="'+facultyId+'" WHERE schoolId="'+schoolId+'" AND institutionId ="'+institutionId+'"';
					db.query(update,(err, up) => {
						if(err){
							console.log("Dean Faculty Update error.");
						}else{
							console.log("Dean Faculty Update success.");

							db.query(update2, (err, up2)=>{
								if(err){
									console.log("School Update error.");
								}else{
									console.log("School Update success.");
									res.redirect('/admin');
								}
							});
						}
					});
				}else if(find[0] == null || err){
					res.redirect("/admin?fault=1");
				}
			});
		}else if(result[0]!= null){
			db.query(qry,(err, seek) => {
				var upd = 'UPDATE faculty SET accessLevel = "5", position = "Regular Faculty", verificationLevel = "3" WHERE facultyId = "'+result[0].facultyId+'"';
				if(seek[0] != null){
					var upd2 = 'UPDATE faculty SET accessLevel = "3", position = "School Dean", verificationLevel = "3", departmentId = null WHERE facultyId = "'+facultyId+'"';
						db.query(upd,(err, up) => {
							if(err){
								console.log("Previous dean update error.");
							}else{
								console.log("Previous dean update success.");

								db.query(upd2,(err, up2) => {
									var upd3 = 'UPDATE institution_school SET deanId = "'+facultyId+'" WHERE schoolId="'+schoolId+'" AND institutionId ="'+institutionId+'"';
										if(err){
										console.log("Current dean update error.");
										}else{
										console.log("Current dean update success.");

										db.query(upd3,(err, up3) => {
											if(err){
											console.log("School update error.");
											}else{
											console.log("School dean update success.");
											res.redirect('/admin');
										}

										});
									}

								});
							}
						});


				}else if(seek[0] == null || err){
					res.redirect("/admin?fault=1");
				}
			});
		}
	});
})

app.post("/addDepartment", function(req, res){
	var institutionId = req.body.institutionId;
	var departmentName = req.body.departmentName;
	var departmentId = req.body.departmentId;
	var schoolId = req.body.schoolId;
	var institutionId = req.body.institutionId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var position = req.body.position;
	var educationalAttainment = req.body.educationalAttainment;
	var yearGraduated = req.body.yearGraduated;
	var schoolGraduated = req.body.schoolGraduated
	var gender = req.body.gender;
	var dob = req.body.dob;
	var facultyType = req.body.facultyType;
	var programGraduated = req.body.programGraduated;
	var dateHired = req.body.dateHired;
	var email = req.body.email;
	var password = req.body.password;
	var accessLevel = 4;
	var description = req.body.description;

	var sql = 'INSERT INTO institution_department VALUES ("'+ institutionId+'","' + schoolId + '", "' + departmentId + '", null, null, null,"'+ description +'")';
	console.log(sql);
	db.query(sql, (err, result) => {
		
		if(err){
			console.log("Department insertion error");
		}else{
		var token = crypto.randomBytes(64).toString('hex');
		var newpass = encrypt(password, token);			

			var depchairsql = 'INSERT INTO faculty VALUES (null,"'+departmentId+'","'+schoolId+'","'+institutionId+'","'+fname+'","'+lname+'","'+mname+'","'+position+'","'+educationalAttainment+'","'+yearGraduated+'","'+schoolGraduated+'","'+gender+'","'+dob+'","'+facultyType+'","'+programGraduated+'","'+dateHired+'","'+email+'","'+newpass+'", "'+token+'", "'+accessLevel+'", "3")';

			db.query(depchairsql, (err,data) => {

				if(err){
						console.log("Department Chair insertion error");
				}else{
					var latestFaculty = data.insertId;
					console.log(latestFaculty);
					var updateDep = 'UPDATE institution_department SET chairmanId = "'+latestFaculty+'" WHERE departmentId ="'+departmentId+'" AND schoolId = "'+schoolId+'" AND institutionId = "'+institutionId+'" ';

					if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.profileImage;

						profileImage.mv("public/images/faculty"+data.insertId+".jpg", function(err){
							if(err){
								console.log("File upload error");
							}else{
								console.log("File upload success");
							}
						});
					}

					db.query(updateDep, (err,departmentupdate) => {
						if(err){
							console.log("Update department error");
						}else{
									var mailOptions = {
									from: 'chedph01@gmail.com',
									to: email,
									subject: "NOREPLY: CHED Steam Cloud Platform invitation",
									text: 'Hello '+fname+' '+mname+' '+lname+', you can now access the CHED Steam Cloud Platform as Department Chairman using your Email and this password: "'+password+'". Thank you!'
								};

								transporter.sendMail(mailOptions, function(error, info){
									if (error) {
										console.log(error);
									} else {
										console.log('Email sent: ' + info.response);
									}
								});
									console.log("Update school dean success");
															console.log("Update department success");
						}
					});
					console.log("Faculty insert success");
				}
			});
			console.log("Department insert Successful");
			res.redirect('/admin');
		}
	});
})

app.post("/editDepartment", function(req, res){
	var departmentName = req.body.departmentName;
	var departmentId = req.body.departmentId;

	var sql = 'UPDATE department SET departmentName = "'+ departmentName +'" WHERE departmentId = ' + departmentId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Department update error");
			res.redirect("/ched?fault=2");
		}else{
			console.log("Department update success");
			res.redirect("/ched");
		}
	});
})

app.post("/deleteDepartment", function(req, res){
	var departmentId = req.body.departmentId;


		var qry = 'UPDATE faculty SET accessLevel = "5", verificationLevel = "3", departmentId = null, position = "Regular Faculty" WHERE departmentId = "'+departmentId+'"';
		if(err){
			console.log("Find department error");
		}else{
			console.log("Find department success");

			db.query(qry, (err, update) => {
				var delq = 'DELETE FROM institution_department WHERE departmentId = "'+departmentId+'"';
				if(err){
				console.log("Update faculty error");
				}else{
				console.log("Update faculty success");

				db.query(delq, (err,delDept) => {
					var delD = 'DELETE FROM department WHERE departmentId = "'+departmentId+'"';
					if(err){
					console.log("Delete institution_department error");
					}else{
					console.log("Delete institution_department success");

					db.query(delD, (err, delDResult) => {
						if(err){
							console.log("Error deleting department.")
						}else{
							console.log("Success deleting department.")
							res.redirect('/ched');
						}
					})
					
				}
				});
			}
			});
		}
});

app.post("/addDeptChair", function(req, res){
	var facultyId = req.body.facultyIdd;
	var institutionId = req.body.institutionId;
	var departmentId = req.body.departmentIdd;
	var accLev = 4;
	var toFaculty = 5;

	var sql ='SELECT faculty.facultyId FROM faculty INNER JOIN institution_department ON faculty.institutionId = institution_department.institutionId WHERE faculty.accessLevel = "4" AND institution_department.chairmanId = faculty.facultyId AND faculty.departmentId = "'+departmentId+'"';

	db.query(sql,(err, result) => {

		var qry = 'SELECT facultyId FROM faculty WHERE institutionId = "'+institutionId+'" AND facultyId = "'+facultyId+'" AND departmentId ="'+departmentId+'"';
		if(result[0] == null){
			db.query(qry,(err, find) => {

				var update = 'UPDATE faculty SET accessLevel = "4", position = "Department Chairman", verificationLevel = "3" WHERE facultyId = "'+facultyId+'"';
				if(find[0] != null){
					var update2 = 'UPDATE institution_department SET chairmanId ="'+facultyId+'" WHERE departmentId="'+departmentId+'" AND institutionId ="'+institutionId+'"';
					db.query(update,(err, up) => {
						if(err){
							console.log("Department Chair Faculty Update error.");
						}else{
							console.log("Department Chair Faculty Update success.");

							db.query(update2, (err, up2)=>{
								if(err){
									console.log("Department Update error.");
								}else{
									console.log("Department Update success.");
									res.redirect('/admin');
								}
							});
						}
					});
				}else if(find[0] == null || err){
				res.redirect("/admin?fault=2");

				}
			});
		}else if(result[0]!= null){
			db.query(qry,(err, seek) => {
				var upd = 'UPDATE faculty SET position = "Regular Faculty", accessLevel = "5", verificationLevel = "3" WHERE facultyId = "'+result[0].facultyId+'"';
				if(seek[0] != null){
					var upd2 = 'UPDATE faculty SET accessLevel = "4", position = "Department Chairman", verificationLevel = "3" WHERE facultyId = "'+facultyId+'"';
						db.query(upd,(err, up) => {
							if(err){
								console.log("Previous chair update error.");
							}else{
								console.log("Previous chair update success.");

								db.query(upd2,(err, up2) => {
									var upd3 = 'UPDATE institution_department SET chairmanId = "'+facultyId+'"  WHERE departmentId="'+departmentId+'" AND institutionId ="'+institutionId+'"';
										if(err){
										console.log("Current chair update error.");
										}else{
										console.log("Current chair update success.");

										db.query(upd3,(err, up3) => {
											if(err){
											console.log("Department update error.");
											}else{
											console.log("Department update success.");
											res.redirect('/admin');
										}

										});
									}

								});
							}
						});


				}else if(seek[0] == null || err){
					res.redirect("/admin?fault=2");
				}
			});
		}
	});
})

app.post("/addProgram", function(req, res){
	var departmentId = req.body.departmentId;
	var programId = req.body.programId;
	var institutionId = req.body.institutionId;
	var description = req.body.description;

	var qry = 'SELECT schoolId FROM institution_department WHERE institutionId = "'+institutionId+'" AND departmentId = "'+departmentId+'" ';

	db.query(qry, (err, data) => {
		var sql = 'INSERT INTO institution_program VALUES ("'+ programId +'", "'+ institutionId +'", "'+ data[0].schoolId +'", "' + departmentId + '", "'+description+'")';

		db.query(sql, (err, result) => {
			if(err){
				console.log("Program insertion error");
			}else{
				console.log("Program insertion success");
				res.redirect("/admin");
			}
		});
	})
		
})

app.post("/editProgram", function(req, res){
	var programId = req.body.programId;
	var programName = req.body.programName;

	var sql = 'UPDATE program SET programName = "' + programName + '" WHERE programId = ' + programId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Program update error");
			res.redirect("/ched?fault=3");
		}else{
			console.log("Program update success");
			res.redirect("/ched");
		}
	});
})

app.post("/deleteProgram", function(req, res){
	var programId = req.body.programId;

	var sql = 'DELETE FROM institution_program WHERE programId = "'+ programId+'"';

	db.query(sql, (err, result) => {
		var qry = 'DELETE FROM program WHERE programId = "'+ programId+'"';
		if(err){
			console.log("Institution_program deletion error");
		}else{
			console.log("Institution_program deletion success");

			db.query(qry, (err, data) => {
				if(err){
					console.log("Program deletion error.")
				}else{
					console.log("Program deletion success.")
					res.redirect("/ched");
				}
			})
			
		}
	});
})

app.post("/addFaculty", function(req,res){
	var institutionId = req.body.institutionId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var position = req.body.position;
	var educationalAttainment = req.body.educationalAttainment;
	var yearGraduated = req.body.yearGraduated;
	var schoolGraduated = req.body.schoolGraduated
	var gender = req.body.gender;
	var dob = req.body.dob;
	var facultyType = req.body.facultyType;
	var programGraduated = req.body.programGraduated;
	var dateHired = req.body.dateHired;
	var email = req.body.email;
	var password = req.body.password;
	var accessLevel = 5;
	var verificationLevel = 3;
	var sql = "";
	
			var token = crypto.randomBytes(64).toString('hex');
			var newpass = encrypt(password, token);
			sql = 'INSERT INTO faculty VALUES (null,null,null,'+institutionId+',"'+fname+'","'+lname+'","'+mname+'","'+position+'","'+educationalAttainment+'","'+yearGraduated+'","'+schoolGraduated+'","'+gender+'","'+dob+'","'+facultyType+'","'+programGraduated+'","'+dateHired+'","'+email+'","'+newpass+'","'+token+'", "'+accessLevel+'", "'+verificationLevel+'")';
			var checkMail = 'SELECT * FROM faculty WHERE email = "'+email+'"';

			db.query(checkMail, (err, checkMail) =>{

			if(checkMail[0] == null){

				if(  validator.validate(email)){
					
					db.query(sql, (err, result) => {
						if(err){
							console.log("Email invalid or data invalid.")
							res.redirect("/admin?fault=3");
						}else{
							var mailOptions = {
								from: 'chedph01@gmail.com',
								to: email,
								subject: "NOREPLY: CHED Steam Cloud Platform invitation",
								text: 'Hello '+fname+' '+mname+' '+lname+', you can now access the CHED Steam Cloud Platform using your Email and this password: "'+password+'". Thank you!'
							};

							transporter.sendMail(mailOptions, function(error, info){
								if (error) {
									console.log(error);
								} else {
									console.log('Email sent: ' + info.response);
								}
							});

							console.log("Faculty insertion success");

							if(!req.files){
								console.log("No files uploaded");
							}else{
								var profileImage = req.files.profileImage;

								profileImage.mv("public/images/faculty"+result.insertId+".jpg", function(err){
									if(err){
										console.log("File upload error");
									}else{
										console.log("File upload success");
									}
								});
							}

							res.redirect('/admin');
						}
					});
				}else{
					console.log("Email not valid.")
					res.redirect("/admin?fault=4");

				}
			}else{
					console.log("Email duplicate.")
					res.redirect("/admin?fault=5");
			}
		});


		
		

});

app.post("/deleteFaculty", function(req,res){
	var facultyId = req.body.facultyId;

	var sql = 'DELETE FROM faculty WHERE facultyId = ' + facultyId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Faculty deletion error");
		}else{
			console.log("Faculty deletion success");
			res.redirect("/admin");
		}
	});
});

app.post("/editProfileAdmin", function(req,res){
	var facultyId = req.body.facultyId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var educationalAttainment = req.body.educationalAttainment;
	var schoolGraduated = req.body.schoolGraduated;
	var specialization = req.body.specialization;
	var dateOfBirth = req.body.dateOfBirth;
	var yearGraduated = req.body.yearGraduated;

	var sql = 'UPDATE faculty SET dateOfBirth = "'+dateOfBirth+'", educationalAttainment = "'+educationalAttainment+'", schoolGraduated = "'+schoolGraduated+'", specialization = "'+specialization+'", fname = "'+ fname +'", lname = "'+lname+'", mname = "'+mname+'", yearGraduated="'+yearGraduated+'" WHERE facultyId = ' + facultyId ;

		console.log(sql);

		db.query(sql, (err, result) => {
			if(err){
				console.log("Edit unsuccessful");
			}else{
				console.log("Edit successful");

				if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.profileImage;

						try{
							profileImage.mv("public/images/faculty"+facultyId+".jpg", function(err){
								if(err){
									console.log("File upload error");
								}else{
									console.log("File upload success");
								}
							});
						}catch(err){};
					}
				res.redirect("/admin");
			};
		});
});

app.post("/editProfile", function(req,res){
	var facultyId = req.body.facultyId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var educationalAttainment = req.body.educationalAttainment;
	var schoolGraduated = req.body.schoolGraduated;
	var specialization = req.body.specialization;
	var dateOfBirth = req.body.dateOfBirth;
	var yearGraduated = req.body.yearGraduated;

	var sql = 'UPDATE faculty SET dateOfBirth = "'+dateOfBirth+'", educationalAttainment = "'+educationalAttainment+'", schoolGraduated = "'+schoolGraduated+'", specialization = "'+specialization+'", fname = "'+ fname +'", lname = "'+lname+'", mname = "'+mname+'", yearGraduated="'+yearGraduated+'" WHERE facultyId = ' + facultyId ;

		console.log(sql);

		db.query(sql, (err, result) => {
			if(err){
				console.log("Edit unsuccessful");
			}else{
				console.log("Edit successful");

				if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.profileImage;

						try{
							profileImage.mv("public/images/faculty"+facultyId+".jpg", function(err){
								if(err){
									console.log("File upload error");
								}else{
									console.log("File upload success");
								}
							});
						}catch(err){};
					}
				res.redirect("back");
			};
		});
});

//edit profile for regular faculty
app.post("/editProfileFaculty", function(req,res){
	var facultyId = req.body.facultyId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var educationalAttainment = req.body.educationalAttainment;
	var schoolGraduated = req.body.schoolGraduated;
	var specialization = req.body.specialization;
	var dateOfBirth = req.body.dateOfBirth;
	var yearGraduated = req.body.yearGraduated;

	var sql1 = 'UPDATE faculty SET dateOfBirth = "'+dateOfBirth+'", educationalAttainment = "'+educationalAttainment+'", schoolGraduated = "'+schoolGraduated+'", specialization = "'+specialization+'", fname = "'+ fname +'", lname = "'+lname+'", mname = "'+mname+'", yearGraduated="'+yearGraduated+'", verificationLevel = "5" WHERE facultyId = ' + facultyId ;

		console.log(sql1);

		db.query(sql1, (err, result) => {
			if(err){
				console.log("Edit unsuccessful");
			}else{
				console.log("Edit successful");

				if(!req.files){
						console.log("No files uploaded");
					}else{
						var profileImage = req.files.profileImage;

						try{
							profileImage.mv("public/images/faculty"+facultyId+".jpg", function(err){
								if(err){
									console.log("File upload error");
								}else{
									console.log("File upload success");
								}
							});
						}catch(err){};
					}
				res.redirect("back");
			};
		});
});

//edit profile for dean only
app.post("/editProfileDean", function(req,res){
	var facultyId = req.body.facultyId;
	var deanId = req.body.deanId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var position = req.body.position;
	var yearGraduated = req.body.yearGraduated;

	var sql = 'UPDATE faculty SET fname = "'+ fname +'", lname = "'+lname+'", mname = "'+mname+'", position = "'+position+'", yearGraduated="'+yearGraduated+'" WHERE facultyId = ' + deanId ;

		console.log(sql);

		db.query(sql, (err, result) => {
			if(err){
				console.log("Edit unsuccessful");
			}else{
				console.log("Edit successful");
				res.redirect("back");
			};
		});
});

//edit profile for director only
app.post("/editProfileDirector", function(req,res){
	var facultyId = req.body.facultyId;
	var directorId = req.body.directorId;
	var fname = req.body.fname;
	var lname = req.body.lname;
	var mname = req.body.mname;
	var educationalAttainment = req.body.educationalAttainment;
	var schoolGraduated = req.body.schoolGraduated;
	var specialization = req.body.specialization;
	var dateOfBirth = req.body.dateOfBirth;
	var yearGraduated = req.body.yearGraduated;

	var sql = 'UPDATE faculty SET dateOfBirth = "'+dateOfBirth+'", specialization = "'+specialization+'", schoolGraduated = "'+schoolGraduated+'", educationalAttainment = "'+educationalAttainment+'", fname = "'+ fname +'", lname = "'+lname+'", mname = "'+mname+'", yearGraduated="'+yearGraduated+'" WHERE facultyId = ' + directorId ;

		console.log(sql);

		db.query(sql, (err, result) => {
			if(err){
				console.log("Edit unsuccessful");
			}else{
				console.log("Edit successful");
				res.redirect("back");
			};
		});
});


app.post("/changePassword", function(req,res){
	var facultyId = req.body.facultyId;
	var oldPassword = req.body.oldPassword;
	var password = req.body.password;
	console.log(oldPassword);
	console.log(password);

	var sql1 = "SELECT password, token FROM faculty WHERE facultyId = '" + facultyId + "'";

		

	db.query(sql1, (err, result) => {
			if(err){
				console.log("Not Retrieved");
			}else{
				var comparepass = decrypt(result[0].password,result[0].token);
				if(oldPassword==comparepass){
					console.log("Old Password Match");
					var token = crypto.randomBytes(64).toString('hex');
					var newpass = encrypt(password, token);
					var sql = 'UPDATE faculty SET password = "'+ newpass +'", token ="'+token+'" WHERE facultyId = ' + facultyId ;

					db.query(sql, (err, result) => {
						if(err){
							console.log("Password change unsuccessful");
						}else{
							console.log("Password change successful");
						};
					});
				}else{
					console.log("Old password does not Match");
				}
				res.redirect("back");
			};
		});
});

app.post("/changePasswordAdmin", function(req,res){
	var facultyId = req.body.facultyId;
	var oldPassword = req.body.oldPassword;
	var password = req.body.password;
	console.log(oldPassword);
	console.log(password);

	var sql1 = "SELECT password, token FROM faculty WHERE facultyId = '" + facultyId + "'";

		

	db.query(sql1, (err, result) => {
			if(err){
				console.log("Not Retrieved");
			}else{
				var comparepass = decrypt(result[0].password,result[0].token);
				if(oldPassword==comparepass){
					console.log("Old Password Match");
					var token = crypto.randomBytes(64).toString('hex');
					var newpass = encrypt(password, token);
					var sql = 'UPDATE faculty SET password = "'+ newpass +'", token ="'+token+'" WHERE facultyId = ' + facultyId ;

					db.query(sql, (err, result) => {
						if(err){
							console.log("Password change unsuccessful");
						}else{
							console.log("Password change successful");
						};
					});
				}else{
					console.log("Old password does not Match");
				}
				res.redirect("/admin");
			};
		});
});


//not yet linked as associative entity
app.post("/addJournal", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var link1 = req.body.link1;
	var year = req.body.year;
	var volume = req.body.volume;
	var category = req.body.category;

	console.log(facultyId);
	console.log(link1);
	console.log(year);
	console.log(volume);

	var sql = 'INSERT INTO journal VALUES (null, "'+ title1 +'", "'+ link1 +'", "'+ year +'", "'+ volume +'","'+category+'",0,0)';

	console.log(sql);

	db.query(sql, (err, result) => {
			var recentJournal = result.insertId;
			console.log(recentJournal);

			var sql1 = 'INSERT INTO faculty_journal VALUES("'+facultyId+'", "'+recentJournal+'")';
			console.log(sql1);

			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result1) => {
					if (err) {
						console.log("Associative journal Entity Insertion failed!");
					}else{
						console.log("Associative journal entity Insertion success!");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.post("/addJournalDept", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var link1 = req.body.link1;
	var year = req.body.year;
	var volume = req.body.volume;
	var category = req.body.category;

	console.log(facultyId);
	console.log(link1);
	console.log(year);
	console.log(volume);

	var sql = 'INSERT INTO journal VALUES (null, "'+ title1 +'", "'+ link1 +'", "'+ year +'", "'+ volume +'","'+ category+'",1,0)';

	console.log(sql);

	db.query(sql, (err, result) => {
			var recentJournal = result.insertId;
			console.log(recentJournal);

			var sql1 = 'INSERT INTO faculty_journal VALUES("'+facultyId+'", "'+recentJournal+'")';
			console.log(sql1);

			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result1) => {
					if (err) {
						console.log("Associative journal Entity Insertion failed!");
					}else{
						console.log("Associative journal entity Insertion success!");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.post("/addJournalDean", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var link1 = req.body.link1;
	var year = req.body.year;
	var volume = req.body.volume;
	var category = req.body.category;

	console.log(facultyId);
	console.log(link1);
	console.log(year);
	console.log(volume);

	var sql = 'INSERT INTO journal VALUES (null, "'+ title1 +'", "'+ link1 +'", "'+ year +'", "'+ volume +'","'+category+'",1,0)';

	console.log(sql);

	db.query(sql, (err, result) => {
			var recentJournal = result.insertId;
			console.log(recentJournal);

			var sql1 = 'INSERT INTO faculty_journal VALUES("'+facultyId+'", "'+recentJournal+'")';
			console.log(sql1);

			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result1) => {
					if (err) {
						console.log("Associative journal Entity Insertion failed!");
					}else{
						console.log("Associative journal entity Insertion success!");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.post("/addBook", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;


	console.log(title1);
	console.log(ISBN);
	console.log(year);
	console.log(edition);

	var sql = 'INSERT INTO book VALUES (null, "'+ title1 +'", "'+ ISBN +'", "'+ edition +'", "'+ year +'","'+category+'",0,0)';
	console.log(sql);
	db.query(sql, (err, result) => {

			var recentBook = result.insertId;
			console.log(recentBook);

			var sql1 = 'INSERT INTO faculty_book VALUES("'+facultyId+'","'+recentBook+'")';
			console.log(sql1);
			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative addition failed");
					}else{
						console.log("Associative addition successful");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.post("/addBookDept", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;


	console.log(title1);
	console.log(ISBN);
	console.log(year);
	console.log(edition);
	console.log(category);

	var sql = 'INSERT INTO book VALUES (null, "'+ title1 +'", "'+ ISBN +'", "'+ edition +'", "'+ year +'","'+category+'",1,0)';
	console.log(sql);
	db.query(sql, (err, result) => {

			var recentBook = result.insertId;
			console.log(recentBook);

			var sql1 = 'INSERT INTO faculty_book VALUES("'+facultyId+'","'+recentBook+'")';
			console.log(sql1);
			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative addition failed");
					}else{
						console.log("Associative addition successful");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.post("/addBookDean", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;


	console.log(title1);
	console.log(ISBN);
	console.log(year);
	console.log(edition);

	var sql = 'INSERT INTO book VALUES (null, "'+ title1 +'", "'+ ISBN +'", "'+ edition +'", "'+ year +'","'+category+'",1,0)';
	console.log(sql);
	db.query(sql, (err, result) => {

			var recentBook = result.insertId;
			console.log(recentBook);

			var sql1 = 'INSERT INTO faculty_book VALUES("'+facultyId+'","'+recentBook+'")';
			console.log(sql1);
			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative addition failed");
					}else{
						console.log("Associative addition successful");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.get("/deptChairVerifyAccount", function(req,res){
	var facultyId = req.query.facultyId;
	var sql = 'UPDATE faculty SET verificationLevel = 4 WHERE facultyId = '+ facultyId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Department Chairman Verification Error");
		}else{
			console.log("Department Chairman Verification Success");
			res.redirect("back");
		}
	});
});

app.get("/schoolDeanVerifyAccount", function(req,res){
	var facultyId = req.query.facultyId;
	var sql = 'UPDATE faculty SET verificationLevel = 3 WHERE facultyId = '+ facultyId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("School Dean Verification Error");
		}else{
			console.log("School Dean Verification Success");
			res.redirect("back");
		}
	});
});
app.post("/editFacultyAdmin", function(req,res){
	var facultyId = req.body.facultyId;
	var fname = req.body.fname;
	var mname = req.body.mname;
	var lname = req.body.lname;
	var position = req.body.position;
	var educationalAttainment = req.body.educationalAttainment;
	var yearGraduated = req.body.yearGraduated;
	var schoolGraduated = req.body.schoolGraduated;
	var dateOfBirth = req.body.dateOfBirth;
	var facultyType = req.body.facultyType;
	var specialization = req.body.specialization;
	var email = req.body.email;

	var sql = 'UPDATE faculty SET fname = "'+fname+'", mname = "'+mname+'", lname = "'+lname+'", position = "'+position+'", educationalAttainment = "'+educationalAttainment+'", yearGraduated = '+yearGraduated+', schoolGraduated = "'+schoolGraduated+'", dateOfBirth = "'+dateOfBirth+'", facultyType = "'+facultyType+'", specialization = "'+specialization+'", email = "'+email+'" WHERE facultyId = '+facultyId;

	if(validator.validate(email)){
		console.log("Email valid");
		db.query(sql, (err, result) => {
			if(err){
				console.log("Admin Edit faculty error");
			}else{
				console.log("Admin edit faculty success");

				if(!req.files){
					console.log("No files uploaded");
				}else{
					var profileImage = req.files.profileImage;

					profileImage.mv("public/images/faculty"+facultyId+".jpg", function(err){
						if(err){
							console.log("File upload error");
						}else{
							console.log("File upload success");
						}
					});
				}

				res.redirect("/admin");
			}
		});
	}else{
		console.log("Email invalid");
	}
});

app.post("/editFaculty", function(req,res){
	var facultyId = req.body.facultyId;
	var fname = req.body.fname;
	var mname = req.body.mname;
	var lname = req.body.lname;
	var position = req.body.position;
	var educationalAttainment = req.body.educationalAttainment;
	var yearGraduated = req.body.yearGraduated;
	var schoolGraduated = req.body.schoolGraduated;
	var dateOfBirth = req.body.dateOfBirth;
	var facultyType = req.body.facultyType;
	var specialization = req.body.specialization;
	var email = req.body.email;

	var sql = 'UPDATE faculty SET fname = "'+fname+'", mname = "'+mname+'", lname = "'+lname+'", position = "'+position+'", educationalAttainment = "'+educationalAttainment+'", yearGraduated = '+yearGraduated+', schoolGraduated = "'+schoolGraduated+'", dateOfBirth = "'+dateOfBirth+'", facultyType = "'+facultyType+'", specialization = "'+specialization+'", email = "'+email+'" WHERE facultyId = '+facultyId;

	if( validator.validate(email) ){
		console.log("Email valid");
		db.query(sql, (err, result) => {
			if(err){
				console.log("Admin Edit faculty error");
			}else{
				console.log("Admin edit faculty success");

				if(!req.files){
					console.log("No files uploaded");
				}else{
					var profileImage = req.files.profileImage;

					profileImage.mv("public/images/faculty"+facultyId+".jpg", function(err){
						if(err){
							console.log("File upload error");
						}else{
							console.log("File upload success");
						}
					});
				}

				res.redirect("back");
			}
		});
	}else{
		console.log("Email invalid");
	}
});

app.post("/addResearch", function(req,res){
	var facultyId = req.body.facultyId;
	var name1 = req.body.name1;
	var status = req.body.status;
	var collaborations = req.body.collaborations;
	var description = req.body.description;
	var coresearchers = req.body.coresearchers;
	var category = req.body.category;
	var year = req.body.year;

	console.log(name1);

	var sql = 'INSERT INTO research VALUES (null, "'+ name1 +'", "'+ status +'", "'+ collaborations +'", "'+ description +'","'+ coresearchers +'","'+category+'","'+year+'",0,0)';

	console.log(sql);

	db.query(sql, (err, result) => {

			var recentResearch = result.insertId;
			console.log(recentResearch);

			var sql1 = 'INSERT INTO faculty_research VALUES("'+facultyId+'","'+recentResearch+'")';

			if(err){
				console.log("Insertion to research unsuccessful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative research failed to insert");
					}else{
						console.log('Associative research successful to inserted!');
					}
				});
				console.log("Insertion to research successful");
				res.redirect("back");
			};
		});
});

app.post("/addResearchDept", function(req,res){
	var facultyId = req.body.facultyId;
	var name1 = req.body.name1;
	var status = req.body.status;
	var collaborations = req.body.collaborations;
	var description = req.body.description;
	var coresearchers = req.body.coresearchers;
	var category = req.body.category;
	var year =  req.body.year;

	console.log(name1);

	var sql = 'INSERT INTO research VALUES (null, "'+ name1 +'", "'+ status +'", "'+ collaborations +'", "'+ description +'","'+ coresearchers +'","'+ category +'","'+ year +'",1,0)';

	console.log(sql);

	db.query(sql, (err, result) => {

			var recentResearch = result.insertId;
			console.log(recentResearch);

			var sql1 = 'INSERT INTO faculty_research VALUES("'+facultyId+'","'+recentResearch+'")';

			if(err){
				console.log("Insertion to research unsuccessful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative research failed to insert");
					}else{
						console.log('Associative research successful to inserted!');
					}
				});
				console.log("Insertion to research successful");
				res.redirect("back");
			};
		});
});

app.post("/addResearchDean", function(req,res){
	var facultyId = req.body.facultyId;
	var name1 = req.body.name1;
	var status = req.body.status;
	var collaborations = req.body.collaborations;
	var description = req.body.description;
	var coresearchers = req.body.coresearchers;
	var category = req.body.category;
	var year = req.body.year;

	console.log(name1);

	var sql = 'INSERT INTO research VALUES (null, "'+ name1 +'", "'+ status +'", "'+ collaborations +'", "'+ description +'","'+ coresearchers +'","'+category+'","'+year+'",1,0)';

	console.log(sql);

	db.query(sql, (err, result) => {

			var recentResearch = result.insertId;
			console.log(recentResearch);

			var sql1 = 'INSERT INTO faculty_research VALUES("'+facultyId+'","'+recentResearch+'")';

			if(err){
				console.log("Insertion to research unsuccessful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative research failed to insert");
					}else{
						console.log('Associative research successful to inserted!');
					}
				});
				console.log("Insertion to research successful");
				res.redirect("back");
			};
		});
});

app.get("/deptChairVerifyBooks", function(req,res){
	var bookId = req.query.bookId;
	var sql = 'UPDATE book SET bookVerificationLevel = 1 WHERE bookId = '+ bookId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Book is not approved");
		}else{
			console.log("Book is now approved");
			res.redirect("back");
		}
	});
});

app.get("/deptChairVerifyJournal", function(req,res){
	var journalId = req.query.journalId;
	var sql = 'UPDATE journal SET journalVerificationLevel = 1 WHERE journalId = '+ journalId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("journal is not approved");
		}else{
			console.log("journal is now approved");
			res.redirect("back");
		}
	});
});

app.get("/deptChairVerifyResearch", function(req,res){
	var researchId = req.query.researchId;
	var sql = 'UPDATE research SET researchVerificationLevel = 1 WHERE researchId = '+ researchId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Research is not approved");
		}else{
			console.log("Reseach is now approved");
			res.redirect("back");
		}
	});
});

app.listen(3000, function(){
	console.log("Server started on Port 3000");
});

app.get("/deleteProgramData", function(req,res){
	var programId = req.query.programId;
	var programDataYear = req.query.programDataYear;
	var institutionId = req.query.institutionId;

	var sql = 'DELETE FROM programdata WHERE programId = '+programId+' AND institutionId = '+institutionId+' AND year = '+programDataYear;
	console.log(sql);
	db.query(sql, (err,result) => {
		if(err){
			console.log("Program Data deletion error");
		}else{
			console.log("Program Data deletion success");

			res.redirect("/admin");
		}
	});
});

app.post("/addProgramData", function(req,res){
	var programId = req.body.programId;
	var institutionId = req.body.institutionId;
	var year = req.body.programDataYear;
	var availability = req.body.programDataAvailability;
	var population = req.body.programDataPopulation;

	var sql = 'SELECT * FROM institution_program WHERE institutionId = "'+institutionId+'" AND programId = "'+programId+'"';
	var confirm = 'SELECT * FROM programdata WHERE institutionId = "'+institutionId+'" AND programId = "'+programId+'" AND year = '+year+'';

	db.query(confirm, (err, find)=>{

		if(find[0] == null){
			db.query(sql, (err, result) => {
				var qry = 'INSERT INTO programdata VALUES ("'+programId+'","'+institutionId+'","'+result[0].departmentId+'","'+result[0].schoolId+'",'+year+',"'+availability+'",'+population+')';
				if(err){
					console.log("Program not found in institution.");
				}else{
					console.log("Program found in institution.");

					db.query(qry, (err, inprogram) =>{
						if(err){
							console.log("Program data insertion error.");
						}else{
							console.log("Program data insertion success.");
							res.redirect("/admin");
						}
					})
					
				}
			});	
		}else{
			console.log("Program data for the program in specific year already exists.")
			res.redirect("/admin?fault=6");
		}
	});
});

app.post("/editProgramData", function(req,res){
	var programId = req.body.programId;
	var institutionId = req.body.institutionId;
	var year = req.body.year;
	var availability = req.body.programDataAvailability;
	var population = req.body.programDataPopulation;

	var sql = 'UPDATE programdata SET availability = "'+availability+'", population = '+population+' WHERE programId = '+programId+' AND institutionId = '+institutionId+' AND year = '+year;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Program Data update error");
		}else{
			console.log("Program Data update success");

			res.redirect("/admin");
		}
	});
});

// CHED Institution

app.get("/addInstitutionAdmin", function(req,res){
	var institutionId = req.query.institutionId;
	var facultyId = req.query.facultyId;
	var adminLevel = 1;
	var toFaculty = 5;

	var sql = 'SELECT facultyId FROM faculty WHERE accessLevel = "1" AND institutionId = "'+institutionId+'"';
	db.query(sql, (err, result) => {

			if(result[0] != null){
				var qry = 'UPDATE faculty SET accessLevel = "'+toFaculty+'", position = "Regular Faculty", verificationLevel = "3" WHERE facultyId = "'+result[0].facultyId+'"';
				db.query(qry,(err,ret) => {
					var newadmin = 'UPDATE faculty SET accessLevel = "'+adminLevel+'", position = "Registrar", verificationLevel="1", departmentId = null, schoolId = null WHERE facultyId = "'+facultyId+'"';
					if(err){
						console.log("Update previous admin error.");
					}else{
						console.log("Update previous admin success.");

						db.query(newadmin,(err,result)=>{
							
							if(err){
								console.log("Update admin error.");
								res.redirect('/ched');
							}else{
								console.log("Update admin success.");
								res.redirect('/ched');

							}
						})

					}
				});
			}else if(result[0] == null){
				var newadmin = 'UPDATE faculty SET accessLevel = "'+adminLevel+'", position = "Registrar", verificationLevel="1", departmentId = null, schoolId = null WHERE facultyId = "'+facultyId+'"';

				db.query(newadmin,(err,ret)=>{
					if(err){
						console.log("Admin update error.");
					}else{
						console.log("Admin update success.");
						res.redirect('/ched');
						
					}
				});
			}else if(err){
				console.log("SELECT ERROR.");
				res.redirect('/ched');
			}
	
	})


});

app.post("/addFacultyToSchool", function(req,res){
	var facultyId = req.body.facultyIdd;
	var institutionId = req.body.institutionId;
	var schoolId = req.body.schoolIdd;

	var changeDept = 'UPDATE faculty SET schoolId = "'+schoolId+'", departmentId = null WHERE facultyId = "'+facultyId+'"';

	db.query(changeDept, (err,result) =>{
		if(err){
			console.log('Error assigning faculty to school.');
			res.redirect('/admin');
		}else{
			console.log('Success assigning faculty to school.');
			res.redirect('/admin');
		}
	})
});

app.post("/addFacultyToDepartment", function(req,res){
	var facultyId = req.body.facultyIdd;
	var institutionId = req.body.institutionId;
	var departmentId = req.body.departmentIdd;

	var matchSchool = 'SELECT schoolId FROM institution_department WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';

	db.query(matchSchool, (err, result) => {

		if(err){
			console.log("Generic error.");
		}else{		
			var updateFaculty = 'UPDATE faculty SET departmentId = "'+departmentId+'", schoolId = "'+result[0].schoolId+'" WHERE facultyId = "'+facultyId+'"';

				db.query(updateFaculty, (err,updateFaculty) => {
					if(err){
						console.log("Updating department error.");
					}else{
						console.log("Success updating faculty department.");
						res.redirect('/admin');
					}
				});
			}
		
	
	});
});

//publicaion edited
app.post("/editBook", function(req,res){
	var facultyId = req.body.value1;
	var bookId = req.body.value2;
	var title = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;

	console.log(bookId);

	var sql = 'UPDATE book SET title = "'+title+'", ISBN = "'+ISBN+'",edition = "'+edition+'", year = "'+year+'", category = "'+category+'" WHERE bookId = "'+bookId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update book failed");
		}else{
			console.log("Update Book Success");
			res.redirect("back");
		}
	});
});

app.post("/editJournal", function(req,res){
	var facultyId = req.body.value1;
	var journalId = req.body.value2;
	var title = req.body.title1;
	var link = req.body.link;
	var year = req.body.year;
	var volume = req.body.volume;
	var category = req.body.category;

	console.log(journalId);

	var sql = 'UPDATE journal SET title = "'+title+'", link = "'+link+'",year = "'+year+'", volume = "'+volume+'",category = "'+category+'" WHERE journalId = "'+journalId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update journal failed");
		}else{
			console.log("Update journal Success");
			res.redirect("back");
		}
	});
});

app.post("/editResearch", function(req,res){
	var facultyId = req.body.value1;
	var researchId = req.body.value2;
	var name = req.body.name1;
	var status = req.body.status;
	var collaborations = req.body.collaborations;
	var description = req.body.description;
	var coresearchers = req.body.coresearchers;
	var category = req.body.category;
	var year = req.body.year;

	console.log(researchId);

	var sql = 'UPDATE research SET name = "'+name+'", status = "'+status+'",collaborations = "'+collaborations+'", description = "'+description+'", category = "'+category+'", year = "'+year+'" WHERE researchId = "'+researchId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update research failed");
		}else{
			console.log("Update research Success");
			res.redirect("back");
		}
	});
});

app.post("/addStudentData", function(req,res){

	var institutionId = req.body.institutionId;
	var departmentId = req.body.departmentId;
	var year = req.body.studentDataYear;
	var enroll = req.body.studentDataEnrollees;
	var graduate = req.body.studentDataGraduates;

	
	var findschool = 'SELECT schoolId FROM institution_department WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';
	db.query(findschool,(err,findschool) => {
		var sql = 'INSERT INTO studentdata VALUES ("'+departmentId+'","'+findschool[0].schoolId+'","'+institutionId+'", "'+year+'","'+enroll+'","'+graduate+'") ';
		
		db.query(sql, (err,result) => {
			if(err){
				console.log("Failure!");
				res.redirect('/admin');
			}else{
				console.log("Success adding student data!")
				console.log(req.session.accessLevel);
				console.log(req.session.userId);
				res.redirect('/admin');
			}
		})
	})
});


app.get("/deleteStudentData", function(req,res){
	var depId = req.query.departmentId;
	var year = req.query.studentDataYear;
	var institutionId = req.query.institutionId;

	var sql = 'DELETE FROM studentdata WHERE departmentId = '+depId+' AND institutionId = '+institutionId+' AND year = '+year;

	db.query(sql, (err,result) => {
		if(err){
			console.log("Student Data deletion error");
		}else{
			console.log("Student Data deletion success");

			res.redirect("/admin");
		}
	});
});

app.post("/editStudentData", function(req,res){
	var depId = req.body.departmentId;
	var institutionId = req.body.institutionId;
	var year = req.body.year;
	var enrollees = req.body.studentDataEnrollees;
	var graduates = req.body.studentDataGraduates;


	var sql = 'UPDATE studentdata SET enrollees = "'+enrollees+'", graduated ="'+graduates+'" WHERE departmentId = "'+depId+'" AND institutionId = "'+institutionId+'" AND year = "'+year+'"';

	db.query(sql, (err,result) => {
		if(err){
			console.log("Student Data update error");
		}else{
			console.log("Student Data update success");
			res.redirect("/admin");
		}
	});
});

app.get("/certifyDepartmentDev", function(req, res){
	var departmentId = req.query.departmentId;
	var institutionId = req.query.institutionId;

	var sql = 'UPDATE institution_department SET centerOfDevelopment = "Certified" WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';

	db.query(sql, (err, result) => {
		if(err){
			console.log("Failure certifying department.");
			res.redirect('/ched');
		}else{
			console.log("Success certifying department.");
			res.redirect('/ched');
		}
	})

})

app.get("/certifyDepartmentEx", function(req, res){
	var departmentId = req.query.departmentId;
	var institutionId = req.query.institutionId;

	var sql = 'UPDATE institution_department SET centerOfExcellence = "Certified", centerOfDevelopment = NULL WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';

	db.query(sql, (err, result) => {
		if(err){
			console.log("Failure certifying exellence.");
		}else{
			console.log("Success certifying excellence.");
			res.redirect('/ched');
		}
	})

})


app.get("/deleteDepartmentCertification", function(req, res){
	var departmentId = req.query.departmentId;
	var institutionId = req.query.institutionId;

	var sql = 'UPDATE institution_department SET centerOfExcellence = NULL, centerOfDevelopment = NULL WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';

	db.query(sql, (err, result) => {
		if(err){
			console.log("Failure deleting certification.");
		}else{
			console.log("Success deleting certification.");
			res.redirect('/ched');
		}
	})

})


<!--REGION--!>

app.post("/chedAddRegion", function(req,res){
	var regionName = req.body.regionname;

	var sql = 'INSERT INTO region VALUES (null, "'+ regionName +'")';

	db.query(sql, (err, result) => {
		if(err){
			console.log("Region insertion error");
			res.redirect("/ched?fault=6");

		}else{
			console.log("Region insertion success");
			res.redirect("/ched");
		}
	});
});


app.post("/chedEditRegion", function(req,res){
	var region_id = req.body.region_id;
	var regionName = req.body.regionName;

	var sql = 'UPDATE region SET regionName = "'+ regionName +'" WHERE region_id = ' + region_id;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Region update error");
			res.redirect("/ched?fault=6");
		}else{
			console.log("Region update success");
			res.redirect("/ched");
		}
	});

});


app.post("/chedDeleteRegion", function(req,res){
	var region_id = req.body.region_id;
	var regionName = req.body.regionName;

	var sql = 'DELETE FROM region WHERE region_id = ' +region_id;
	
	db.query(sql,(err,result)=>{
		if(err){
			console.log("Region delete error");
		}else{
			console.log("Region delete success");
			res.redirect("/ched");
		}
	})

});



app.post("/chedAddSchool", function(req, res){

	var schoolName = req.body.schoolName;

	var sql = 'INSERT INTO school VALUES (null, "'+ schoolName +'")';

	db.query(sql, (err, result) => {
		if(err){
			console.log("School insertion error");
			res.redirect("/ched?fault=1");

		}else{
			console.log("School insertion success");
			res.redirect("/ched");
		}
	});
});

app.post("/chedAddDepartment", function(req, res){

	var departmentName = req.body.departmentName;

	var sql = 'INSERT INTO department VALUES (null, "'+ departmentName +'")';

	db.query(sql, (err, result) => {
		if(err){
			console.log("Department insertion error");
			res.redirect("/ched?fault=2");

		}else{
			console.log("Department insertion success");
			res.redirect("/ched");
		}
	});
});

app.post("/chedAddProgram", function(req, res){
	var programName = req.body.programName;

	var sql = 'INSERT INTO program VALUES (null, "' + programName + '")';

	db.query(sql, (err, result) => {
		if(err){
			console.log("Program insertion error");
			res.redirect("/ched?fault=3");

		}else{
			console.log("Program insertion success");
			res.redirect("/ched");
		}
	});
})


app.post("/deleteSchoolAdmin", function(req, res){
	var schoolId = req.body.schoolId;
	var institutionId = req.body.institutionId;

	var sql = 'SELECT * FROM institution_school WHERE schoolId = "'+schoolId+'" AND institutionId = "'+institutionId+'"';
	db.query(sql, (err, result) => {
		var qry = 'UPDATE faculty SET accessLevel = "5", verificationLevel = "3", schoolId = null, departmentId = null, position = "Regular Faculty" WHERE schoolId = "'+schoolId+'" AND institutionId = "'+institutionId+'"';
		if(err){
			console.log("Find school error.");
		}else{
			console.log("Find school success.");

			db.query(qry, (err, update) => {
				var delq = 'DELETE FROM institution_school WHERE schoolId = "'+schoolId+'" AND institutionId = "'+institutionId+'"';
				if(err){
				console.log("Update faculty error.");
				}else{
				console.log("Update faculty success.");

				db.query(delq, (err,delSchool) => {
					var deld = 'DELETE FROM institution_department WHERE schoolId = "'+schoolId+'" AND institutionId = "'+institutionId+'"';
					if(err){
					console.log("Delete school error.");
					}else{
					console.log("Delete School success.");
					
					db.query(deld, (err,delDept) => {
						if(err){
						console.log("Delete related department error.");
						}else{
						console.log("Delete related department success.");
						res.redirect('/admin');
						}
					})

				}
				});
			}
			});
		}
	});
})

app.post("/deleteDepartmentAdmin", function(req, res){
	var departmentId = req.body.departmentId;
	var institutionId = req.body.institutionId;


		var qry = 'UPDATE faculty SET accessLevel = "5", verificationLevel = "3", departmentId = null, position = "Regular Faculty" WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';

			db.query(qry, (err, update) => {
				var deld = 'DELETE FROM institution_department WHERE departmentId = "'+departmentId+'" AND institutionId = "'+institutionId+'"';
				if(err){
				console.log("Update faculty error");
				}else{
				console.log("Update faculty success");

				db.query(deld, (err,delDept) => {
					if(err){
					console.log("Delete department error");
					}else{
					console.log("Delete department success");
					res.redirect('/admin');
				}
				});
			}
			});
		
	
})

app.post("/deleteProgramAdmin", function(req, res){
	var programId = req.body.programId;
	var institutionId = req.body.institutionId;
	
	var delp = 'DELETE FROM institution_program WHERE programId = "'+programId+'" AND institutionId = "'+institutionId+'"';

		db.query(delp, (err, delp) => {
			if(err){
				console.log("Error deleting program.");
			}else{
				console.log("Success deleting program.");
				res.redirect('/admin');
			}
		})


})

//ADD THESIS HERREEEEE BOII
app.post("/addThesis", function(req,res){
	var facultyId = req.body.facultyId;
	var title1 = req.body.title1;
	var author = req.body.author;
	var adviser = req.body.adviser;
	var topic = req.body.topic;
	var year = req.body.year;
	var status = req.body.status;


	console.log(title1);
	console.log(author);
	console.log(adviser);
	console.log(facultyId);

	var sql = 'INSERT INTO thesis VALUES (null, "'+ adviser +'", "'+ title1 +'", "'+ year +'", "'+ status +'", "'+ topic +'","'+ author +'")';
	console.log(sql);
	db.query(sql, (err, result) => {

			var recentThesis = result.insertId;
			console.log(recentThesis);

			var sql1 = 'INSERT INTO faculty_thesis VALUES("'+adviser+'","'+recentThesis+'")';
			console.log(sql1);
			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative addition failed");
					}else{
						console.log("Associative addition successful");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

///edit thesis boi
app.post("/editThesis", function(req,res){
	var facultyId = req.body.value1;
	var thesisId = req.body.value2;
	var title = req.body.name1;
	var dateDefended = req.body.dateDefended;
	var status = req.body.status;
	var topic = req.body.topic;
	var student_author = req.body.student_author;
	var category = req.body.category;
	
	var sql = 'UPDATE thesis SET title = "'+title+'", dateDefended = "'+dateDefended+'",publicationStatus = "'+status+'", topic = "'+topic+'", student_author = "'+student_author+'" WHERE thesisId = "'+thesisId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update thesis failed");
		}else{
			console.log("Update thesis Success");
			res.redirect("back");
		}
	});
});

//faculty edit publications
app.post("/editBookFaculty", function(req,res){
	var facultyId = req.body.value1;
	var bookId = req.body.value2;
	var title = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;

	console.log(bookId);

	var sql = 'UPDATE book SET title = "'+title+'", ISBN = "'+ISBN+'",edition = "'+edition+'", year = "'+year+'", category = "'+category+'", bookVerificationLevel = "0" WHERE bookId = "'+bookId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update book failed");
		}else{
			console.log("Update Book Success");
			res.redirect("back");
		}
	});
});

app.post("/editJournalFaculty", function(req,res){
	var facultyId = req.body.value1;
	var journalId = req.body.value2;
	var title = req.body.title1;
	var link = req.body.link;
	var year = req.body.year;
	var volume = req.body.volume;
	var category = req.body.category;

	console.log(journalId);

	var sql = 'UPDATE journal SET title = "'+title+'", link = "'+link+'",year = "'+year+'", volume = "'+volume+'",category = "'+category+'", journalVerificationLevel = "0" WHERE journalId = "'+journalId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update journal failed");
		}else{
			console.log("Update journal Success");
			res.redirect("back");
		}
	});
});

app.post("/editResearchFaculty", function(req,res){
	var facultyId = req.body.value1;
	var researchId = req.body.value2;
	var name = req.body.name1;
	var status = req.body.status;
	var collaborations = req.body.collaborations;
	var description = req.body.description;
	var coresearchers = req.body.coresearchers;
	var category = req.body.category;
	var year = req.body.year;

	console.log(researchId);

	var sql = 'UPDATE research SET name = "'+name+'", status = "'+status+'",collaborations = "'+collaborations+'", description = "'+description+'", category = "'+category+'", year = "'+year+'", researchVerificationLevel = "0" WHERE researchId = "'+researchId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update research failed");
		}else{
			console.log("Update research Success");
			res.redirect("back");
		}
	});
});

app.get("/deptChairDenyBooks", function(req,res){
	var bookId = req.query.bookId;
	var sql = 'UPDATE book SET denyStatus = 1 WHERE bookId = '+ bookId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Book is not approved");
		}else{
			console.log("Book is now approved");
			res.redirect("back");
		}
	});
});

app.get("/deptChairDenyJournal", function(req,res){
	var journalId = req.query.journalId;
	var sql = 'UPDATE journal SET journalDenyStatus = 1 WHERE journalId = '+ journalId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("journal is not approved");
		}else{
			console.log("journal is now approved");
			res.redirect("back");
		}
	});
});

app.get("/deptChairDenyResearch", function(req,res){
	var researchId = req.query.researchId;
	var sql = 'UPDATE research SET reserchDenyStatus = 1 WHERE researchId = '+ researchId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Research is not approved");
		}else{
			console.log("Reseach is now approved");
			res.redirect("back");
		}
	});
});

app.get("/reapproveBooks", function(req,res){
	var bookId = req.query.bookId;
	var sql = 'UPDATE book SET bookVerificationLevel = 1, denyStatus = 0 WHERE bookId = '+ bookId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("Book is not approved");
		}else{
			console.log("Book is now approved");
			res.redirect("back");
		}
	});
});

app.get("/reapproveJournals", function(req,res){
	var journalId = req.query.journalId;
	var sql = 'UPDATE journal SET journalVerificationLevel = 1, journalDenyStatus = 0 WHERE journalId = '+ journalId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("journal is not approved");
		}else{
			console.log("journal is now approved");
			res.redirect("back");
		}
	});
});

app.get("/reapproveResearches", function(req,res){
	var researchId = req.query.researchId;
	var sql = 'UPDATE research SET researchVerificationLevel = 1, reserchDenyStatus = 0 WHERE researchId = '+ researchId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Research is not approved");
		}else{
			console.log("Reseach is now approved");
			res.redirect("back");
		}
	});
});

app.get("/deleteBook", function(req,res){
	var facultyId = req.body.value1;
	var bookId = req.query.bookId;
	var title = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;

	console.log(facultyId);
	console.log(bookId);

	var sql = 'UPDATE book SET bookVerificationLevel = 1, denyStatus = 1 WHERE bookId = "'+bookId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("delete book failed");
		}else{
			console.log("delete Book Success");
			res.redirect("back");
		}
	});
});

app.get("/deletejournals", function(req,res){
	var facultyId = req.body.value1;
	var journalId = req.query.journalId;
	var title = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;

	console.log(facultyId);
	console.log(journalId);

	var sql = 'UPDATE journal SET journalVerificationLevel = 1, journalDenyStatus = 1 WHERE journalId = "'+journalId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("delete book failed");
		}else{
			console.log("delete Book Success");
			res.redirect("back");
		}
	});
});

app.get("/deleteresearch", function(req,res){
	var facultyId = req.body.value1;
	var researchId = req.query.researchId;
	var title = req.body.title1;
	var ISBN = req.body.ISBN;
	var edition = req.body.edition;
	var year = req.body.year;
	var category = req.body.category;

	console.log(facultyId);
	console.log(researchId);

	var sql = 'UPDATE research SET researchVerificationLevel = 1, reserchDenyStatus = 1 WHERE researchId = "'+researchId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("delete book failed");
		}else{
			console.log("delete Book Success");
			res.redirect("back");
		}
	});
});

app.post("/addPresentation", function(req,res){
	var facultyId = req.body.facultyId;
	var presentation = req.body.presentation;
	var paper = req.body.paper;
	var confdate = req.body.confdate;


	console.log(facultyId);
	console.log(presentation);
	console.log(paper);
	console.log(confdate);

	var sql = 'INSERT INTO presentation VALUES (null,"'+presentation+'","'+paper+'","'+confdate+'",0,0)';
	console.log(sql);
	db.query(sql, (err, result) => {

			var recentPres = result.insertId;
			console.log(recentPres);

			var sql1 = 'INSERT INTO faculty_presentation VALUES("'+facultyId+'","'+recentPres+'")';
			console.log(sql1);
			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative addition failed");
					}else{
						console.log("Associative addition successful");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});

app.post("/addPresentationDept", function(req,res){
	var facultyId = req.body.facultyId;
	var presentation = req.body.presentation;
	var paper = req.body.paper;
	var confdate = req.body.confdate;


	console.log(facultyId);
	console.log(presentation);
	console.log(paper);
	console.log(confdate);

	var sql = 'INSERT INTO presentation VALUES (null,"'+presentation+'","'+paper+'","'+confdate+'",1,0)';
	console.log(sql);
	db.query(sql, (err, result) => {

			var recentPres = result.insertId;
			console.log(recentPres);

			var sql1 = 'INSERT INTO faculty_presentation VALUES("'+facultyId+'","'+recentPres+'")';
			console.log(sql1);
			if(err){
				console.log("Insertion successful");
			}else{
				db.query(sql1, (err, result2) => {
					if (err) {
						console.log("Associative addition failed");
					}else{
						console.log("Associative addition successful");
					}
				});
				console.log("Insertion successful");
				res.redirect("back");
			};
		});
});


app.post("/editPresFaculty", function(req,res){
	var facultyId = req.body.value1;
	var presentationId = req.body.value2;
	var presentationName = req.body.presentationName;
	var paperName = req.body.paperName;
	var confdate = req.body.confdate;
	

	console.log(presentationId);

	var sql = 'UPDATE presentation SET `presentationName`="'+presentationName+'",`paperName`="'+paperName+'",`date`="'+confdate+'",`presentVerificationLevel`=0 WHERE presentationId = "'+presentationId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update presentation failed");
		}else{
			console.log("Update presentation Success");
			res.redirect("back");
		}
	});
});

app.post("/editPresDept", function(req,res){
	var facultyId = req.body.value1;
	var presentationId = req.body.value2;
	var presentationName = req.body.presentationName;
	var paperName = req.body.paperName;
	var confdate = req.body.confdate;
	

	console.log(presentationId);

	var sql = 'UPDATE presentation SET `presentationName`="'+presentationName+'",`paperName`="'+paperName+'",`date`="'+confdate+'",`presentVerificationLevel`=1 WHERE presentationId = "'+presentationId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Update presentation failed");
		}else{
			console.log("Update presentation Success");
			res.redirect("back");
		}
	});
});

app.get("/deletePres", function(req,res){
	var facultyId = req.query.value1;
	var presentationId = req.query.presentationId;


	console.log(facultyId);
	console.log(presentationId);

	var sql = 'UPDATE presentation SET presentVerificationLevel = 1, presentDenyStatus = 1 WHERE presentationId = "'+presentationId+'"';
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("delete presentation failed");
		}else{
			console.log("delete presentation Success");
			res.redirect("back");
		}
	});
});


app.get("/deptChairVerifyPres", function(req,res){
	var presentationId = req.query.presentationId;
	console.log(presentationId);
	var sql = 'UPDATE presentation SET presentVerificationLevel = 1 WHERE presentationId = '+ presentationId;
	console.log(sql);

	db.query(sql, (err, result) => {
		if(err){
			console.log("Research is not approved");
		}else{
			console.log("Reseach is now approved");
			res.redirect("back");
		}
	});
});

app.get("/deptChairDenyPres", function(req,res){
	var presentationId = req.query.presentationId;
	var sql = 'UPDATE presentation SET presentDenyStatus = 1 WHERE presentationId = '+ presentationId;

	db.query(sql, (err, result) => {
		if(err){
			console.log("presentation is not approved");
		}else{
			console.log("presentation is now approved");
			res.redirect("back");
		}
	});
});





app.post("/emailUs", function(req,res){
	var email = req.body.email;
	var contents = req.body.contents;
	var name=req.body.person;

	if( validator.validate(email)){
		var mailOptions = {
        from: email, 
        to: 'chedph01@gmail.com', 
        subject: 'Support Email from '+name+' <'+email+'>', 
        text: contents // plaintext body

    };

    transporter.sendMail(mailOptions, function(error, info) {
         if (error) {
            console.log(error);
         }else{
         	console.log('Message sent: ' + info.response);
         	
         }
         res.redirect('/admin');
     });
	}else{
		console.log("Email not valid.")
		res.redirect("/admin?fault=4");

	}
});

app.post("/emailUsChed", function(req,res){
	var email = req.body.email;
	var contents = req.body.contents;
	var name=req.body.person;

	if( validator.validate(email)){
		var mailOptions = {
        from: email, 
        to: 'chedph01@gmail.com', 
        subject: 'Support Email from '+name+' <'+email+'>', 
        text: contents // plaintext body

    };

    transporter.sendMail(mailOptions, function(error, info) {
         if (error) {
            console.log(error);
         }else{
         	console.log('Message sent: ' + info.response);
         	
         }
         res.redirect('/ched');
     });
	}else{
		console.log("Email not valid.")
		res.redirect("/ched?fault=4");

	}
});

app.get("/print", function(req,res){
	var accessLevel = req.query.q;
	var about = req.query.p;
	
	res.download("reports/"+accessLevel+"/"+about+".pdf");
});
