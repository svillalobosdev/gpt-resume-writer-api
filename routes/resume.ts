import { Router } from "express";
import fs from "fs";
import { prisma } from "..";
import { authenticate } from "../middlewares/authenticate";
import { openai } from "../utils/openai";
import { cloudinary } from "../utils/cloudinary";
import path from "path";
import { generatePdf } from "../utils/pdf";

process.env.PHANTOMJS_PATH = "/app/vendor/phantomjs/bin/phantomjs";

const resumeRouter = Router();

resumeRouter.post(
  "/generate",
  authenticate,
  async (req, res) => {
    try {
      const { 
        profileId,
        company_name,
        job_title,
        job_description,
        user
      } = req.body;



      if(!profileId || !company_name || !job_title || !job_description) {
        return res.status(400).send({
          success: false,
          message: "Missing parameters",
        });
      }

      const profile = await prisma.profiles.findUnique(
        {
          where: {
            id: profileId,
          },
          include: {
            experiences: true,
            educations: true,
          },
        }
      );

      const gptResponse = await openai.chat.completions.create({
        model: process.env.CUSTOM_GPT_MODEL || "gpt-4o", // Use Custom Model ID
        messages: [
          { role: "system", content: `
              You are an expert resume writer specializing in ATS-optimized resumes for **senior professionals in the United States**. Your task is to generate a **custom resume** for a **senior professional with at least 9–10 years of experience**, targeting **consulting firms and startups**. Ensure the resume is **concise, structured, and follows an optimal order** to maximize recruiter engagement.
              The main goal is to get lots of score of jobscan.co. it means that you should catch all hard and soft skills in the job description and make your resume similar. You should contain all keywords which are in job description on the resume.
              Only include Header Section, Summary, Technical Skills, Education, Certifications, Professional Experience. Please remove other explanation or unnecessary parts such as Older Experience or Note.

              ### **Instructions:**  

              #### 1. **Header Section (Include Job Details for ATS Optimization)**  
                - **Full Name**  
                - **Job Title (Exact JD Title)**  
                - **Location (City, State)**  
                - **Email, Phone, LinkedIn Profile**  

              #### 2. **Summary (Highlight Core Expertise, Experience, and Value)**  
                - Write a **3–5 sentence professional summary** that:  
                  - **Clearly states total years of experience** (e.g., "12 years of experience in software engineering...")  
                  - **Includes the exact job title from the JD**  
                  - **Highlights key technical competencies and relevant soft skills**  
                  - **Mentions industry sectors (e.g., finance, healthcare, SaaS, etc.), if relevant**  
                  - **Avoids subjective or passionate wording (e.g., "excited," "enthusiastic")**  

              #### 3. **Technical Skills (Over 50 Hard & Soft Skills Clearly Defined for ATS)**  
                - **Clearly list technical competencies without expertise levels (recruiters assume proficiency)**  
                - **Include technologies and tools directly from the JD**  
                - **Organize into logical categories for readability**  

                ##### **Example Formatting:**  
                **Programming Languages:** C#, Java, Python, TypeScript, JavaScript, Go  
                **Frameworks & Libraries:** ASP.NET Core, Blazor, Angular, React, Vue.js, Next.js, Node.js  
                **Cloud & DevOps:** AWS, Azure, GCP, Docker, Kubernetes, Terraform, Jenkins, GitLab CI/CD  
                **Databases:** SQL Server, PostgreSQL, MySQL, MongoDB, Redis, Cassandra  
                **Security & Authentication:** IAM, OAuth, SAML, JWT, OpenID Connect  

              #### 4. **Education (Keep Concise & Use Standard Formatting)**  
                - **Degree Name** | **University Name** | **Location** | **Graduation Date (Month YYYY)**  
                - **Exclude details such as GPA, extracurricular activities, or coursework**  

              #### 5. **Certifications (Only Include Industry-Recognized, Relevant to the Role)**  
                - **AWS Certified Solutions Architect – Associate**  
                - **Microsoft Certified: Azure DevOps Engineer Expert**  
                - **Kubernetes Certified Administrator (CKA)**  
                - **Other relevant certifications mentioned in the JD**  

              #### 6. **Professional Experience (Most Recent & Relevant First, Older Roles Summarized)**  
                - **Use “Professional Experience” for ATS optimization**  
                - **Must include at least 30 Responsibilities or Contributions, and Achievements in the each position.**  
                - **Prioritize recent roles with full details (should be included at least 20 responsibilities) (3-4 positions, each with 20+ bullet points)**  
                - **Summarize older experience with minimal detail**  
                - **Use "Month YYYY" format strictly (e.g., March 2019)**  
                - **Weave in technologies and languages naturally within bullet points**  
                - **Each bullet point should include a measurable result, impact, or outcome**  
                - **Include lots of soft and hard skills are mentioned in the job description. so you should find the soft skills from job description and include them several times in the experience section.**  
                - **Hard skills: programming languages, database management, statistical analysis, and storage system and management. Soft skills: communication, interpersonal skills, decisiveness, and problem-solving skills**  

                ##### **Example Professional Experience Formatting:**  
                **[Company Name] | [Job Title Matching JD] | [Company Location (City, State)] | [March 2019 – Present]**  
                - Designed and developed **microservices-based cloud architecture** using **.NET Core, Kubernetes, and AWS Lambda**, improving **scalability by 35%** and enabling **faster service deployment**.  
                - Improved database performance by **60%** by optimizing **PostgreSQL indexing and query execution**, reducing **latency in mission-critical applications**.  
                - Led the integration of **GraphQL and RESTful APIs** with **Node.js, ASP.NET Core**, improving **data retrieval speed by 50%** and enhancing **cross-team collaboration**.  
                - Developed and deployed **CI/CD pipelines using GitLab CI/CD, Terraform, and Docker**, reducing **deployment time by 40%** while ensuring **continuous application reliability**.  
                - Migrated **monolithic applications to a microservices architecture**, reducing deployment time by **50%**, while integrating **automated monitoring and logging solutions**.  
                - Enhanced system security by implementing **OAuth 2.0, OpenID Connect, and SAML authentication**, ensuring compliance with **SOC 2 and ISO 27001**.  
                - Led a **multi-region cloud migration (AWS & Azure)**, ensuring **99.99% uptime**, optimizing cloud costs by **20%**, and improving overall performance.  
                - Designed **serverless applications using AWS Lambda and Azure Functions**, reducing **infrastructure costs by 30%** while improving **performance efficiency**.  
                - Managed **RabbitMQ and Kafka** for **real-time data streaming**, improving **event-driven processing speed by 45%**.  
                - Implemented **Infrastructure as Code (IaC) using Terraform and Kubernetes Helm**, reducing provisioning time by **75%**.  

                **Older Experience (Summarized Example):**  
                **[Company Name] | [Older Job Title] | [Company Location] | [March 2014 – March 2017]**  
                - Developed and maintained enterprise applications using **C#, .NET, and SQL Server**.  
                - Led Agile development teams, implementing **DevOps workflows** and automating CI/CD pipelines.  
                - Migrated legacy applications from **on-premise to cloud (AWS, Azure)**, reducing **operational overhead**.  

              ---
            ` },
          {
              role: "user",
              content: `
                This is the information of me.
                # ${profile?.name}

                DOB: ${profile?.dob}
                Address: ${profile?.address}
                Email: ${profile?.email}
                LinkedIn profile: ${profile?.linkedin}
                Phone: ${profile?.phone}

                Main skills: ${profile?.skills.map((skill) => `${skill} • `)}
                Education: ${profile?.educations.map((education) => `${education.name}, Location: ${education.location}, Date: ${education.start_date} - ${education.end_date}, ${education.degree} in ${education.subject} \n`)}
                Experience:
                ${profile?.experiences.map((experience) => `${experience.name}, Location: ${experience.location}, Date: ${experience.start_date} - ${experience.end_date}, ${experience.type}, ${experience.environment} \n`)} 

                Certifications: 
                ${profile?.certifications.map((certification) => `${certification} \n`)}

                This is targeting job information.
                Job Title: ${job_title}
                Job Description: 
                ${job_description}
              `,
          },
        ],
      });

      const markdownContent  = gptResponse.choices[0]?.message.content || "";
      const resumeTitle = `resume${Date.now()}.pdf`;
      const outputPath = path.join("/tmp", resumeTitle);

      // Generate PDF
      await generatePdf(markdownContent, outputPath);
      
      const uploadResult = await cloudinary.uploader.upload(outputPath, {
          resource_type: "raw",
          folder: "resumes",
      });

      fs.unlinkSync(outputPath);

      const downloadUrl = uploadResult.secure_url.replace(
        "/upload/",
        "/upload/fl_attachment/"
      );

      await prisma.jobs.create({
        data: {
          title: job_title,
          description: job_description,
          profile_id: profileId,
          company_name: company_name,
          resume: downloadUrl,
          user_id: user.id || ""
        }
      });

      return res.status(200).send({
        success: true,
        message: "Resume generated successfully",
        data: {
          content: markdownContent,
          resumeTitle: resumeTitle,
          pdfUrl: downloadUrl,
        },
      });

    } catch (error) {
      console.log(error);

      return res.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default resumeRouter;
