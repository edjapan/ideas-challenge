# Backend Email Setup via CLI

You asked if I can set up the automated email backend for you—**yes, absolutely!** 

Instead of you doing it in the Firebase Console, I can write and deploy a **Firebase Cloud Function** directly from the terminal. This function will automatically listen for new submissions in your database and send the email with the unique link.

## User Review Required

> [!IMPORTANT]  
> Firebase itself does not send custom emails for free out-of-the-box. To actually send an email to a user, the backend needs an **SMTP Server** or an **Email Provider API Key**.

## Open Questions

Before I can deploy the code, I need you to provide the credentials for the email account that will be sending these emails. 

You have two options:
1. **(Recommended) Resend / SendGrid / Mailgun**: If you have one of these, please provide the API Key.
2. **Gmail App Password**: If you want to send emails from a normal Gmail account, you can go to your Google Account > Security > 2-Step Verification > App Passwords, and generate a 16-character password. I would need your **Gmail address** and that **App Password**.

*(If you just want me to set up a "Test Mode" that doesn't send real emails but proves the code works, let me know!)*

## Proposed Changes

1. **Initialize Firebase Functions**: I will run `firebase init functions` in your project directory using the CLI.
2. **Write the Cloud Function**: I will create an `index.js` file in the `functions` folder that uses the `onDocumentCreated` trigger for the `applications` collection.
3. **Email Logic**: I will use the `nodemailer` library to construct the HTML email thanking the user and embedding their unique link (`submit-idea.html?id=xyz`).
4. **Deploy**: I will run `firebase deploy --only functions` to push the code live to your Google Cloud project.

Once you provide the email credentials, I'll execute this immediately!
