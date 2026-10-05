const mysql = require('mysql2/promise');

let connection = null;

async function query(sql, params) {
    //Singleton DB connection
    if (null === connection) {
        console.log('Here');
        connection = await mysql.createConnection({
            host: "student-databases.cvode4s4cwrc.us-west-2.rds.amazonaws.com",
            user: "in_class_activity",
            password: "in_class_activity",
            database: 'in_class_activity'
        });
    }
   
    const [results, ] = await connection.execute(sql, params);
    return results;
}

module.exports = {
    query
}
