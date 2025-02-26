import puppeteer from "puppeteer-core";
import fs from "fs";
import { Remarkable } from "remarkable"

export async function generatePdf(markdownContent, cssPath, outputPath) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_BIN || "/app/.apt/usr/bin/google-chrome", // Correct path for Heroku-installed Chromium
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--headless'
    ]
  });
  const page = await browser.newPage();

  // Convert Markdown to HTML
  const md = new Remarkable();
  const htmlContent = md.render(markdownContent);

  // Load CSS styles if provided
  let customCss = "";
  if (fs.existsSync(cssPath)) {
      customCss = fs.readFileSync(cssPath, "utf8");
  }

  // Wrap Markdown content in HTML with styling
  const styledHtml = `
      <html>
      <head>
          <meta charset="UTF-8">
          <style>
              /* Resume Container */
            body {
              max-width: 1200px;
              margin: 0 auto;
              padding: 30px;
              background: #fff;
              font-family: "Arial", sans-serif;
              color: #333;
              line-height: 1.6;
            }

            /* Resume Header */
            h1, h2, h3 {
              color: #333;
              font-weight: bold;
            }

            h1 {
              font-size: 28px;
              text-align: center;
              margin-bottom: 15px;
            }

            h2 {
              font-size: 22px;
              margin-bottom: 10px;
              border-bottom: 2px solid #007acc;
              padding-bottom: 5px;
            }

            h3 {
              font-size: 18px;
              margin-bottom: 6px;
            }

            /* Contact Info */
            p {
              font-size: 16px;
              line-height: 1.5;
              color: #555;
              margin-bottom: 10px;
            }

            a {
              color: #007acc;
              text-decoration: none;
              font-weight: bold;
            }

            a:hover {
              text-decoration: underline;
            }

            /* Section Separator */
            hr {
              border: 1px solid #ddd;
              margin: 20px 0;
            }

            /* Lists */
            ul {
              padding-left: 20px;
              margin: 10px 0;
            }

            li {
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 5px;
            }

            /* Certifications (Checkmark before each item) */
            ul li::before {
              color: #007acc;
              font-weight: bold;
              display: inline-block;
              width: 20px;
            }

            /* Footer */
            footer {
              margin-top: 30px;
              font-size: 14px;
              color: #888;
              text-align: center;
            }
          </style>
      </head>
      <body>
          ${htmlContent}
      </body>
      </html>
  `;

  // Set page content and generate PDF
  await page.setContent(styledHtml, { waitUntil: "networkidle0" });
  await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" }
  });

  await browser.close();
}