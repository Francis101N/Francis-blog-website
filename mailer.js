const express = require("express");
const nodemailer = require("nodemailer");

require('dotenv').config();  // Load environment variables

const app = express();
const port = process.env.PORT || 5000;


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const mailOptions = {
  from: '"TechbyFrancis" <officenotification@cliprivateac.com>',
  to: "francisnwankwo37@gmail.com",
  subject: "Welcome to TechbyFrancis Blog!",
  html: `
    <h2>Thank you for joining our platform!</h2>
    <p>We’re excited to have you on board. This worked</p>
  `
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Email error:", error);
  } else {
    console.log("Email sent:", info.response);
  }
});


app.listen(port, () => { 
    console.log(`Server started at port ${port}.`);
 })
