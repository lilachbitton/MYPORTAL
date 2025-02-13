import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'info@business-express.co.il',
    pass: 'umxu bine ambj immx',
  },
  tls: {
    rejectUnauthorized: false,
  }
});

const emailHtml = (username) => `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ברוכים הבאים לבית הספר למנהלים!</title>
  <style>
    body {
      direction: rtl;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #FF6B6B 0%, #ff4b1f 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 100%);
    }
    .header img {
      width: 180px;
      margin-bottom: 24px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    }
    .header h1 {
      margin: 0;
      color: white;
      font-size: 32px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .content {
      padding: 40px;
      color: #2d3748;
    }
    .welcome-text {
      font-size: 20px;
      margin-bottom: 30px;
      color: #1a202c;
      line-height: 1.7;
    }
    .welcome-text strong {
      color: #ff4b1f;
      font-weight: 600;
    }
    .info-box {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .info-box h3 {
      margin: 0 0 16px 0;
      color: #2d3748;
      font-size: 18px;
      font-weight: 600;
    }
    .info-item {
      display: flex;
      align-items: center;
      margin: 12px 0;
      padding: 8px 0;
      border-bottom: 1px solid #edf2f7;
    }
    .info-label {
      font-weight: 500;
      color: #718096;
      width: 120px;
    }
    .info-value {
      color: #2d3748;
      font-weight: 500;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #ff4b1f 0%, #FF6B6B 100%);
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      margin: 32px 0;
      text-align: center;
      transition: transform 0.2s ease;
      box-shadow: 0 4px 6px rgba(255, 75, 31, 0.2);
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 8px rgba(255, 75, 31, 0.25);
    }
    .support-text {
      background: #f7fafc;
      border-radius: 8px;
      padding: 20px;
      margin-top: 32px;
      font-size: 15px;
      color: #4a5568;
      line-height: 1.6;
    }
    .footer {
      text-align: center;
      padding: 32px;
      background: #1a202c;
      color: #a0aec0;
    }
    .footer p {
      margin: 0;
      font-size: 14px;
    }
    .footer strong {
      color: #fff;
      font-weight: 600;
    }
    .highlights {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 32px 0;
    }
    .highlight-box {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .highlight-box h4 {
      color: #ff4b1f;
      margin: 0 0 8px 0;
      font-size: 16px;
    }
    .highlight-box p {
      margin: 0;
      color: #4a5568;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://login-portal-peach.vercel.app/images/logo.png" alt="Business Express" />
      <h1>ברוכים הבאים!</h1>
    </div>
    
    <div class="content">
      <div class="welcome-text">
        שלום <strong>${username}</strong>,<br>
        ברוכים הבאים לבית הספר למנהלים - תכנית המעשית לעסק טיטניום!
      </div>

      <div class="info-box">
        <h3>פרטי ההתחברות שלך:</h3>
        <div class="info-item">
          <span class="info-label">שם משתמש:</span>
          <span class="info-value">${username}</span>
        </div>
      </div>

      <div class="highlights">
        <div class="highlight-box">
          <h4>ליווי אישי</h4>
          <p>צוות המומחים שלנו זמין לכל שאלה</p>
        </div>
        <div class="highlight-box">
          <h4>תכנים מקצועיים</h4>
          <p>חומרי לימוד עדכניים ומעשיים</p>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="https://login-portal-peach.vercel.app/" class="cta-button">
          כניסה למערכת
        </a>
      </div>

      <div class="support-text">
        צוות בית הספר למנהלים עומד לרשותך בכל שאלה או בקשה.<br>
        נשמח לעזור לך להצליח בדרך שלך!
      </div>
    </div>

    <div class="footer">
      <p>בברכה,<br><strong>צוות ביזנס אקספרס</strong></p>
    </div>
  </div>
</body>
</html>`;

export async function POST(request) {
  try {
    const { to, subject, text, username } = await request.json();
    const htmlContent = emailHtml(username);

    await transporter.sendMail({
      from: 'info@business-express.co.il',
      to,
      subject: "ברוכים הבאים לעסק טיטניום! 🎉",
      text,
      html: htmlContent,
    });

    return new Response(JSON.stringify({ message: 'Email sent successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}