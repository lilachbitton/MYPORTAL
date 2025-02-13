import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // אם משתמשים ב-465, יש להגדיר ל-true
  auth: {
    user: 'info@business-express.co.il',
    pass: 'Rockstar2024', // או השתמשי ב-App Password אם נדרש
  },
  tls: {
    rejectUnauthorized: false // אפשרות לעזור במקרה של בעיות TLS
  }
});

// בדיקת חיבור ל-SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error('החיבור נכשל:', error);
  } else {
    console.log('השרת מוכן לקבל הודעות – החיבור הצליח!');
  }
});
