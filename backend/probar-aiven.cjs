const mysql = require("mysql2");
const fs = require("fs");

const conexion = mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: {
    ca: fs.readFileSync(process.env.DB_SSL_CA, "utf8"),
    rejectUnauthorized: true
  },
  connectTimeout: 15000
});

conexion.connect((error) => {
  if (error) {
    console.error("ERROR:", error.code, error.message);
    process.exitCode = 1;
    conexion.destroy();
    return;
  }

  console.log("Conexion MySQL OK");

  conexion.query("SELECT VERSION() AS version", (error, resultado) => {
    if (error) {
      console.error("ERROR CONSULTA:", error.code, error.message);
    } else {
      console.log(resultado);
    }

    conexion.end();
  });
});
