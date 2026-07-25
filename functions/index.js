const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");

exports.sendApplicationEmail = onDocumentCreated("applications/{appId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }
  
  const data = snapshot.data();
  const appId = event.params.appId;
  const userEmail = data.email;
  const userName = data.name;

  if (!userEmail) {
    console.log(`No email found for application ${appId}`);
    return;
  }

  // Create a test account on Ethereal (since real credentials weren't provided)
  const testAccount = await nodemailer.createTestAccount();

  // Create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  const uniqueLink = `https://your-domain.com/submit-idea.html?id=${appId}`;

  // Email content
  const mailOptions = {
    from: '"Earth & Space Challenge" <no-reply@earthspacechallenge.com>', // sender address
    to: userEmail, // list of receivers
    subject: "Thank you for your interest! Please complete your application.", // Subject line
    text: `Hello ${userName},\n\nThank you for participating in the Earth & Space Challenge! Please complete your application by submitting your idea using the following link:\n\n${uniqueLink}\n\nBest regards,\nThe Earth & Space Challenge Team`, // plain text body
    html: `
      <h2>Hello ${userName},</h2>
      <p>Thank you for participating in the Earth & Space Challenge!</p>
      <p>Please complete your application by submitting your idea using the following link:</p>
      <a href="${uniqueLink}" style="display:inline-block;padding:10px 20px;color:white;background-color:#4a90e2;text-decoration:none;border-radius:5px;">Submit Your Idea</a>
      <p>Best regards,<br>The Earth & Space Challenge Team</p>
    `, // html body
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Message sent: ${info.messageId}`);
    // Ethereal provides a preview URL since it's a test account:
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error(`Error sending email to ${userEmail}:`, error);
  }
});
