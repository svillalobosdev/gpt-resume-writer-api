import puppeteer from "puppeteer";
import fs from "fs";
import { Remarkable } from "remarkable"

export async function generatePdf(markdownContent, cssPath, outputPath) {
  const browser = await puppeteer.launch({
    'args' : [
      '--no-sandbox',
      '--disable-setuid-sandbox'
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
            body {
              max-width: 1000px; /* Increased width for a better resume layout */
              margin: 0 auto;
              padding: 25px; /* Slightly reduced padding for compactness */
              background: #f9f9f9;
              font-family: "Arial", sans-serif;
              color: #333;
              line-height: 1.6;
            }

            /* Resume Header */
            h1, h2, h3 {
              color: #222;
              font-weight: bold;
            }

            h1 {
              font-size: 26px; /* Well-balanced main title */
              text-align: center;
              margin-bottom: 12px;
              text-transform: uppercase;
            }

            h2 {
              font-size: 20px; /* Elegant, professional section headers */
              margin-bottom: 10px;
              padding-bottom: 4px;
              border-bottom: 3px solid #007acc; /* Accent underline */
            }

            h3 {
              font-size: 18px;
              margin-bottom: 6px;
              color: #444;
            }

            /* Contact Info */
            p {
              font-size: 15px;
              line-height: 1.5;
              color: #555;
              margin-bottom: 8px;
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
              margin: 18px 0;
            }

            /* Lists */
            ul {
              padding-left: 18px;
              margin: 8px 0;
            }

            li {
              font-size: 15px;
              line-height: 1.5;
              margin-bottom: 5px;
            }

            /* Certifications (Checkmark before each item) */
            ul li::before {
              content: "✔"; /* Professional checkmark */
              color: #007acc;
              font-weight: bold;
              display: inline-block;
              width: 20px;
            }

            /* Experience & Skills Section */
            .experience, .skills {
              padding: 10px;
              background: #ffffff;
              border-left: 5px solid #007acc; /* Stylish left accent */
              box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.05);
              margin-bottom: 15px;
            }

            /* Footer */
            footer {
              margin-top: 20px;
              font-size: 13px;
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