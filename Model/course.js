const connection = require('./connection');

async function getAllCourses(parameters = {}) {
    let selectSql = `SELECT
            major,
            class_number,
            professor
        FROM gimm_classes`,
    whereStatements = [],
    orderByStatements = [],
    queryParameters = [];

    if (typeof parameters.gimm !== 'undefined' && parseInt(parameters.gimm) === 0) {
        
    }

    if (typeof parameters.instructor !== 'undefined' && parameters.instructor.length > 0) {
        
    }


    if (typeof parameters.level !== 'undefined' && parseInt(parameters.level) !== 0) {
       
    }


    if (typeof parameters.sort !== 'undefined') {
       
    }


    //Dynamically add WHERE expressions to SELECT statements if needed
    if (whereStatements.length > 0) {
        selectSql = selectSql + ' WHERE ' + whereStatements.join(' AND ');
    }

    //Dynamically add ORDER BY expressions to SELECT statements if needed
    if (orderByStatements.length > 0) {
        selectSql = selectSql + ' ORDER BY ' + orderByStatements.join(', ');
    }

    //Dynamically add LIMIT expressions to SELECT statements if needed
    if (typeof parameters.limit !== 'undefined' && parameters.limit > 0 &&  parameters.limit < 6) {
        selectSql = selectSql + ' LIMIT ' + parameters.limit;
    }

    return await connection.query(selectSql, queryParameters);
}

module.exports = {
    getAllCourses
}