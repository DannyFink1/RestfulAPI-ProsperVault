const express = require('express');
const cors = require('cors');
const dotenv = require("dotenv");
const mysql = require('mysql2/promise');
const Ajv = require("ajv");
const jwt = require("jsonwebtoken");


//Express use
const app = express();
app.use(cors());
app.use(express.urlencoded({extended: true}));
app.use(express.json());
const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}

dotenv.config();




const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})


async function query(sql, params) {
    try {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
}


async function checkConnection() {
    try {
        // Execute a simple query to check the connection
        await pool.query('SELECT 1');
        console.log('Connected to the MySQL server.');
    } catch (err) {
        console.error('Error connecting to MySQL server:', err);
    } finally {
        // Close the connection pool
    }
}
// Call the function to check the connection
checkConnection();

//Schematics

let balance_schema = {
    type: "object",
    properties: {
      usernumber: {type: "string"}
    },
    required: ["usernumber"],
    additionalProperties: false
  }

let deposit_schema = {
    type: "object",
    properties: {
      usernumber: {type: "string"},
      iban: {type: "string"},
      amount: {type: "number"}
    },
    required: ["usernumber", "iban", "amount"],
    additionalProperties: false
  }

  const balance_validate = ajv.compile(balance_schema);
  const deposit_validate = ajv.compile(deposit_schema);



//Functions

app.get("/balance", async function(req, res){
  
    let valid = balance_validate(req.body);
    if(!valid){
        console.log(valid.errors);
        res.send("womp")
        return 0;
    }

    let sql = "SELECT usernumber, balance, useable_balance FROM account WHERE usernumber = ?";
    var result = await query(sql, [req.body.usernumber]);
    console.log(result);

    if(results[0] == undefined){
        res.send("nix gefunden");
        return 0;
    }


    res.send(result);
      
});


app.get("/transactions", async function(req, res){
  
    let valid = balance_validate(req.body);
    if(!valid){
        console.log(req.body);
        res.send("womp")
        return 0;
    }

    let sql = "SELECT t.transmitter, t.receiver, a.ID, t.value, t.text, t.date FROM transaction as t INNER JOIN account as a ON t.transmitter = a.ID OR t.receiver = a.ID WHERE a.usernumber = ?";
    var results = await query(sql, [req.body.usernumber]);

    //add the statement [received, sent]
    for (const i in results) {
        if(results[i].transmitter == results[i].ID) {
            results[i].type = "sent";
        } else {
            results[i].type = "received";
        }
        delete results[i].transmitter;
        delete results[i].receiver;
        delete results[i].ID;
    }
    if(results[0] == undefined){
        res.send("nix gefunden");
        return 0;
    }
    res.send(results);
      
});

app.get("/moneyflow", async function(req,res){
    let valid = balance_validate(req.body);
    if(!valid){
        console.log(valid.errors);
        res.send("womp")
        return 0;
    }

    let sql = "SELECT a.ID, w.* FROM withdrawal as w INNER JOIN account as a ON w.receiver = a.ID WHERE a.usernumber = ?";
    var results = await query(sql, [req.body.usernumber]);

    if(results[0] == undefined){
        res.send("nix gefunden");
        return 0;
    }


    res.send(results);


});

app.put("/deposit", async function(req,res){
    let valid = deposit_validate(req.body);
    if(!valid){
        console.log(valid.errors);
        res.send("womp")
        return 0;
    }

    let sql = "SELECT * FROM account WHERE iban = ?";
    var results = await query(sql, [req.body.iban]);

    if(results[0] == undefined){
        res.send("nix gefunden");
        return 0;
    }

    const receiver_id = results[0].ID;
    const todayDate = new Date();
    const formattedDate = todayDate.toISOString().split('T')[0].replace(/-/g, ' ');
    console.log(todayDate);
    console.log(results);

    let sql2 = "SELECT * FROM account WHERE usernumber = ?";
    var results = await query(sql2, [req.body.usernumber]);

    if(results[0] == undefined){
        res.send("nix gefunden");
        return 0;
    }
    const transmitter_id = results[0].ID;

    console.log(results);

    let sql3 = "INSERT INTO prosperVault.deposit (receiver, transmitter, value, `date`) VALUES( ?, ?, ?, '')";

    var results = await query(sql2, [receiver_id, transmitter_id, req.body.amount, formattedDate]);
    res.send(results);
    

  


});

//Start App 
app.listen(3000,() => console.log("ProsperVault REST gestartet"));