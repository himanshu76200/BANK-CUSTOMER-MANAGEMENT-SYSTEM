var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser = require('body-parser'); 
var session = require('express-session');

var globaluser = "null";
var globalid = "null";
var r_accountno = "null";
var f_amount = 0;

function setamount(t){
	f_amount = t;
}

function setrano(x){
	r_accountno = x;
}

function setglobalid(i){
	globalid = i;
}
function setglobaluser(u){
	globaluser = u;
}

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'bank_management_system'
})

connection.connect(function(err){
    if (err) throw err;
    console.log("connected to database!");
})

app.get('/', function(req, res) {
    res.render('home.ejs');
})

app.get('/login', function(req, res){
    if (req.session.loggedin) {
		var user = req.session.username;
		res.render("login.ejs",{user: user});
	} else {
		res.send('Please login to view this page!');
	}
	res.end();
})

app.post('/auth', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	var cid = username.substring(0,4);

	setglobaluser(username);
	setglobalid(cid);

	if (username && password) {
		connection.query('SELECT * FROM cus_login WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				req.session.loggedin = true;
				req.session.username = username;
				res.redirect('/login');
			} else {
				res.send('Incorrect Username and/or Password!');
			}			
			res.end();
		});
	} else {
		res.send('Please enter Username and Password!');
		res.end();
	}
});


app.get("/login/check_balance", function(req, res){
	connection.query("SELECT ac_balance FROM account WHERE ac_customerid = ?", [globalid],  function(err,results){
		var balance = results[0].ac_balance;
		res.render("check_balance.ejs", {balance: balance});
	})
})

app.get("/login/edit_account", function(req, res){
	res.render("edit_account.ejs",{user: globaluser});
})

app.get("/login/recent_transactions", function(req, res){
	connection.query("SELECT * FROM transactions WHERE sen_cus_id = ? OR rec_cus_id = ?" , [globalid, globalid], function(error, results){
		res.send(results);
	})
})

app.get("/login/transaction", function(req, res){
	connection.query("SELECT * FROM account WHERE ac_customerid = ? ", [globalid], function(error, results){
		var balance = results[0].ac_balance;
		var name = globaluser.substring(4);
		res.render("transaction.ejs",{balance: balance, name: name});
	})
})

app.post('/send_money', function(req, res) {
	var account_no = req.body.account_no;
	var amount = req.body.amount;
	console.log(amount);
	setrano(account_no);
	setamount(amount);

	connection.query("SELECT * FROM account WHERE ac_customerid = ?", [globalid], function(error, results){
		const ac_balance = results[0].ac_balance;
			console.log(ac_balance);
			connection.query("UPDATE account SET ac_balance = ? WHERE ac_customerid = ?", [ac_balance-amount,globalid],function(error2, results2){
				console.log("amount deducted!!");
			})
	})

	connection.query("SELECT * FROM account WHERE ac_acc_number = ? ", [account_no], function(error, results){
		var ac_balance = results[0].ac_balance;
		var rec_cust_id = results[0].ac_customerid;
		console.log(ac_balance);
		connection.query("UPDATE account SET ac_balance = ? WHERE ac_acc_number = ? ", [parseInt(ac_balance)+parseInt(amount),account_no],function(error2, results2){
			console.log("amount recieved!!");
			res.redirect("/success_transaction");
		})
	})
});

app.get("/success_transaction", function(req, res){
	connection.query("SELECT * FROM account WHERE ac_acc_number = ? ", [r_accountno], function(error, results){
		var r_cid = results[0].ac_customerid;
		if (error) throw error;
		else {
			connection.query("INSERT INTO transactions VALUES (?, ?, ?, ?)", [globalid,r_cid,globalid + r_cid ,f_amount], function(error2 ,results2){
				if (error2) throw error2;
				else {
					res.send("TRANSACTION SUCESSFUL!!");
					console.log("transaction table updated!");
				}
			})
		}
		
	})
})


app.get("/login/edit_account/aadhar", function(req,res){
	connection.query("SELECT * FROM customer WHERE c_id = ? ",[globalid], function(error, results){
		if(results[0].c_aadhar_no == 0) {
			res.render("aadhar.ejs",{name: globaluser});
		}
		else {
			res.send("YOUR AADHAR IS ALREADY LINKED TO OUR BANK SERVER!!");
		}
	})
	
})

app.post("/update_aadhar", function(req, res){
	var aadhar_no = req.body.aadhar_no;
	connection.query("UPDATE customer SET c_aadhar_no = ? WHERE c_id = ?",[aadhar_no, globalid], function(error, results){
		console.log("AADHAR UPDATED!!");
		res.send("SUCCESSFULLY UPDATED AADHAR!!");
	})
})

app.get("/login/edit_account/panno", function(req,res){
	connection.query("SELECT * FROM customer WHERE c_id = ? ",[globalid], function(error, results){
		if(results[0].c_pan_no == 0) {
			res.render("panno.ejs",{name: globaluser});
		}
		else {
			res.send("YOUR PAN no IS ALREADY LINKED TO OUR BANK SERVER!!");
		}
	})
})

app.post("/update_panno", function(req, res){
	var pan_no = req.body.panno;
	connection.query("UPDATE customer SET c_pan_no = ? WHERE c_id = ?",[pan_no, globalid], function(error, results){
		if (error) throw error;
		else {
			console.log("PAN UPDATED!!");
			res.send("SUCCESSFULLY UPDATED PAN DETAILS!!");
		}
	})
})

app.get("/login/edit_account/address", function(req,res){
	connection.query("SELECT * FROM customer WHERE c_id = ? ",[globalid], function(error, results){
		if(results[0].c_address == 0) {
			res.render("address.ejs",{name: globaluser});
		}
		else {
			res.send("YOUR ADDRESS IS ALREADY LINKED TO OUR BANK SERVER!!");
		}
	})
})

app.post("/update_address", function(req, res){
	var address = req.body.address;
	connection.query("UPDATE customer SET c_address = ? WHERE c_id = ?",[address, globalid], function(error, results){
		if (error) throw error;
		else {
			console.log("ADDRESS UPDATED!!");
			res.send("SUCCESSFULLY UPDATED  ADDRESS!!");
		}
	})
})

app.listen(8080, function(){
    console.log("connected on localhost:8080");
})

