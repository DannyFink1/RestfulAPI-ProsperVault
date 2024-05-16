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
  const balance_validate = ajv.compile(balance_schema);


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
    res.send(result);
      
});


app.get("/transactions", async function(req, res){
  
    let valid = balance_validate(req.body);
    if(!valid){
        console.log(valid.errors);
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
    res.send(results);


});


//Start App 
app.listen(3000,() => console.log("ProsperVault REST gestartet"));