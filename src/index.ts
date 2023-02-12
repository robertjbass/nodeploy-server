import dotenv from "dotenv";
dotenv.config();

console.log({ NODE_ENV: process.env.NODE_ENV });
const prod = process.env.NODE_ENV === "production";

console.log("Hello World", prod);
