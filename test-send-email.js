const { Resend } = require("resend");
require("dotenv").config({ path: ".env" });

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("No API Key");
    return;
  }
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "RealStock <onboarding@resend.dev>";
  
  console.log("Sending from:", from);
  
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: ["leobatisti@hotmail.com"],
      subject: "Test Email",
      html: "<p>This is a test</p>",
    });
    console.log("Result:", { data, error });
  } catch (err) {
    console.log("Catch Error:", err);
  }
}
main();
