import jwt from "jsonwebtoken";

export const signJWT = (id: string, email: string) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        id,
        email,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1d",
      },
      (err, token) => {
        if (err) {
          console.log(err);
          reject("Could not sign the JWT");
        }
        resolve(token);
      }
    );
  });
};
