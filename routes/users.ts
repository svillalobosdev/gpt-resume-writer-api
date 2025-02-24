import { Router, Request, Response } from "express";
import { prisma } from "..";
import bcrypt from "bcrypt";
import { authenticate } from "../middlewares/authenticate";
import {
  signJWT,
} from "../utils";
import { ROLES_PER_USER } from "../config/constants";

const usersRouter = Router();

usersRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      permission = false,
      role = ROLES_PER_USER.GUEST_ROLE,
    } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "Missing parameters",
      });
    }

    const userExist = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if(userExist && userExist.password != "") {
      return res.status(409).send({
        success: false,
        message: "This email already exists. Please login.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    let user;
    if(userExist?.password == "") {
      user = await prisma.users.update({
        where: {
          email: email,
        },
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          permission,
        },
      });
    } else {
      user = await prisma.users.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          permission
        },
      });
    }

    const token = await signJWT(user.id, user.email);

    const { password: _, ...userWithoutPassword } = user;

    return res.status(201).send({
      success: true,
      message: "User created successfully",
      data: {
        token,
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

usersRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "Missing parameters",
      });
    }

    const user = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (!user || user.password == "") {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).send({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = await signJWT(user.id, user.email);

    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).send({
      success: true,
      message: "User logged in successfully",
      data: {
        token,
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

usersRouter.post("/user-exist", async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await prisma.users.findUnique({
    where: {
      email,
    },
  });

  if (user) {
    return res.send({
      success: true,
      data: {
        exist: true,
      }
    });
  } else {
    return res.send({
      success: true,
      data: {
        exist: false,
      }
    });
  }
})

usersRouter.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permission: true,
      }
    });

    return res.status(200).send({
      success: true,
      message: "Users fetched successfully",
      data: {
        users: users,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

usersRouter.get("/user-list", authenticate, async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        role: "1"
      }
    });

    return res.status(200).send({
      success: true,
      message: "Users fetched successfully",
      data: {
        users: users,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

usersRouter.patch(
  "/update",
  async (req: Request, res: Response) => {
    try {
      const {
        userId,
        role = 0,
        permission = false,
      } = req.body;

      if (!userId) {
        return res.send({
          success: false,
          message: "Missing parameters",
        });
      }

      const updatedUser = await prisma.users.update({
        where: {
          id: userId,
        },
        data: {
          role,
          permission
        },
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.send({
        success: true,
        message: "User updated successfully",
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.log(error)
      return res.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

usersRouter.get(
  "/verify",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { user } = req.body;

      const foundUser = await prisma.users.findUnique({
        where: {
          id: user.id,
        },
      });

      if (!foundUser) {
        return res.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      const { password: _, ...userWithoutPassword } = foundUser;

      return res.status(200).send({
        success: true,
        message: "User verified successfully",
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      return res.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

usersRouter.delete(
  "/delete",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { user, id } = req.body;

      if (user.id === id) {
        return res.status(400).send({
          success: false,
          message: "You cannot delete yourself",
        });
      }

      const userData = await prisma.users.findUnique({
        where: {
          id: user.id,
        },
      });

      if (!userData || userData.role !== "2") {
        return res.status(401).send({
          success: false,
          message: "Unauthorized",
        });
      }

      const deletedUser = await prisma.users.delete({
        where: {
          id,
        },
      });

      const { password: _, ...userWithoutPassword } = deletedUser;

      return res.status(200).send({
        success: true,
        message: "User deleted successfully",
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error: any) {
      console.log(error);

      return res.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default usersRouter;
