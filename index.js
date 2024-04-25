const express = require('express');
const cors = require('cors');
const dotenv = require("dotenv");
const mysql = require('mysql2/promise');
const Ajv = require("ajv");
const jwt = require("jsonwebtoken");


//Express use
const app = express();


//Functions




//Start App 
app.listen(3000,() => console.log("Example REST gestartet"));