export const checkEnvVariables = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env file");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in .env file");
  }

  // if (!process.env.AIMBASE_URL) {
  //   throw new Error("AIMBASE_URL is not defined in .env file");
  // }

  // if (!process.env.AIMBASE_USERNAME) {
  //   throw new Error("AIMBASE_USERNAME is not defined in .env file");
  // }

  // if (!process.env.AIMBASE_PASSWORD) {
  //   throw new Error("AIMBASE_PASSWORD is not defined in .env file");
  // }
};
