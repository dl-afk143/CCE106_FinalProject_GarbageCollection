const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.MYSQLHOST || "localhost",
port: process.env.MYSQLPORT || 3306,
user: process.env.MYSQLUSER || "root",
password: process.env.MYSQLPASSWORD || "buoCpmyBbGAcVWaWwsJPqDPOAzIazOsd",
database: process.env.MYSQLDATABASE || "railway",
});

module.exports = db;
