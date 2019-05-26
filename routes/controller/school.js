var express = require("express");
var router = express.Router();
const pool = require("../../config/config");
var { jsonInsertQuery, executeQuery } = require("../../utils/common");
// var executeQuery = require("../../utils/common");

router
  .route("/")
  .post(async (request, response) => {
    let schoolDetailsBody = {
      school_name: request.body.school_name,
      school_address: request.body.school_address,
      school_city_id: request.body.school_city_id,
      school_state_id: request.body.school_state_id,
      school_county_id: request.body.school_county_id,
      school_zip: request.body.school_zip,
      status: request.body.status,
      phones: request.body.phones,
      emails: request.body.emails
    };
    let checkLoginId = await executeQuery(
      `select * from school_credential where login_id='${
        request.body.login_id
      }'`
    );
    console.log("checkLoginId", checkLoginId);
    if (checkLoginId.length > 0) {
      response.statusCode = 400;
      response.json({
        success: 1,
        message: `Login ID ${
          request.body.login_id
        } id already exist. Try other login id `
      });
      return;
    }
    let result = await executeQuery(
      jsonInsertQuery("school_details", schoolDetailsBody)
    );
    if (result.affectedRows > 0) {
      let credentialBody = {
        school_id: result.insertId,
        registration_date_time: parseInt(new Date().getTime()),
        login_id: request.body.login_id
      };
      let innerResult = await executeQuery(
        jsonInsertQuery("school_credential", credentialBody)
      );
      if (innerResult.affectedRows > 0) {
        response.statusCode = 201;
        response.json({
          success: 1,
          message: "School inserted successfully"
        });
      } else {
        let deleteSchool = await executeQuery(
          `delete from school_details where school_id=${result.insertId}`
        );
        response.statusCode = 400;
        response.json({
          success: 1,
          message: "Something went wrong.. Try again."
        });
      }
    } else {
      response.statusCode = 409;
      response.send("Something went wrong... Try again");
    }
  })
  .get((request, response) => {
    pool.query(
      `select * from school_details inner join school_credential on school_credential.school_id=school_details.school_id`,
      (error, result) => {
        if (error) throw error;

        if (result.length > 0) {
          response.statusCode = 200;
          response.json({
            success: 1,
            data: result
          });
        } else {
          response.statusCode = 404;
          response.send("School not found");
        }
      }
    );
  });

router.route("/change-status/:schoolId/:op*?").put((request, response) => {
  pool.query(
    `update school_details set status='${
      request.body.status
    }' where school_id=${request.params.schoolId}`,
    (error, result) => {
      if (error) throw error;
      if (result.affectedRows > 0) {
        response.statusCode = 200;
        response.json({
          success: 1,
          data: `Status of school has been changes to ${request.body.status}`
        });
        if (request.body.status === "APPROVED") {
          pool.query(
            `CREATE TABLE ${request.params.schoolId}_home_work (
            home_work_id int(11) NOT NULL,
            home_work_date date NOT NULL,
            subject_id int(11) NOT NULL,
            home_work_flag boolean NULL,
            home_work_details text NULL,
            PRIMARY KEY (home_work_id),
            KEY home_work_fk0 (subject_id)
          )`,
            (error, result) => {
              if (error) throw error;
              console.log(result);
            }
          );
        }
      } else {
        response.statusCode = 400;
        if (result.message.split(":")[1].split(" ")[1] === "0") {
          response.json({
            success: 1,
            data: "School Id not found"
          });
        }
        response.json({
          success: 1,
          data: "Something went wrong"
        });
      }
    }
  );
});

module.exports = router;
