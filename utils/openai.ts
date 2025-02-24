import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// 🔮 OpenAI Configuration with Custom Model
export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});