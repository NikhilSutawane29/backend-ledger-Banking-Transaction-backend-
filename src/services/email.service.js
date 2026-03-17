const nodemailer = require("nodemailer");

// here we are creating a transporter object using the nodemailer.createTransport() method. This transporter will be used to send emails from our application. We are configuring the transporter to use Gmail as the email service provider and providing the necessary authentication details for OAuth2 authentication. The authentication details include the user email (process.env.EMAIL_USER), client ID (process.env.CLIENT_ID), client secret (process.env.CLIENT_SECRET), and refresh token (process.env.REFRESH_TOKEN). These values are stored in environment variables for security reasons, and they allow our application to authenticate with Gmail's SMTP server and send emails on behalf of the specified user.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error configuring email transporter:", error);
  } else {
    console.log("Email transporter is configured successfully");
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  const info = await transporter.sendMail({
    from: `"Banking System" <${process.env.EMAIL_USER}>`, // sender address
    to, // list of receivers
    subject, // Subject line
    text, // plain text body
    html, // html body
  });

  console.log("Email sent: %s", info.messageId);

  return info;
};

const sendRegistrationEmail = async (userEmail, name) => {
  const subject = "Welcome to Our Banking System!";
  const text = `Dear ${name},\n\nThank you for registering with our banking system. We are excited to have you on board! If you have any questions or need assistance, please feel free to contact our support team.\n\nBest regards,\nThe Banking System Team`;
  const html = `<p>Dear ${name},</p><p>Thank you for registering with our banking system. We are excited to have you on board! If you have any questions or need assistance, please feel free to contact our support team.</p><p>Best regards,<br>The Banking System Team</p>`;

  await sendEmail(userEmail, subject, text, html);
};


const sendTransactionEmail = async (userEmail, name, amount, toAccount) => {
  const subject = "Transaction Alert: Funds Transferred";
  const text = `Dear ${name},\n\nWe would like to inform you that a transaction of amount ${amount} has been successfully transferred to account ${toAccount}. If you did not authorize this transaction or have any questions, please contact our support team immediately.\n\nBest regards,\nThe Banking System Team`;
  const html = `<p>Dear ${name},</p><p>We would like to inform you that a transaction of amount ${amount} has been successfully transferred to account ${toAccount}. If you did not authorize this transaction or have any questions, please contact our support team immediately.</p><p>Best regards,<br>The Banking System Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}




const sendTransactionFailureEmail = async (userEmail, name, amount, toAccount) => {
  const subject = "Transaction Alert: Transaction Failed";
  const text = `Dear ${name},\n\nWe would like to inform you that a transaction of amount ${amount} to account ${toAccount} has failed. If you have any questions or need assistance, please contact our support team immediately.\n\nBest regards,\nThe Banking System Team`;
  const html = `<p>Dear ${name},</p><p>We would like to inform you that a transaction of amount ${amount} to account ${toAccount} has failed. If you have any questions or need assistance, please contact our support team immediately.</p><p>Best regards,<br>The Banking System Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}



module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail
};

// Note for transporter configuration:- So here whenever our server wants to send an email, it can communicate with the transporter object defined in this email service. The transporter will handle the actual sending of the email using the configured Gmail account and OAuth2 authentication. This allows us to easily send emails from our application without having to worry about the underlying email sending logic, as it is abstracted away by the nodemailer library and the transporter configuration.
