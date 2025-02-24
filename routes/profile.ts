import { Router, Request, Response } from "express";
import { prisma } from "..";
import { authenticate } from "../middlewares/authenticate";
import moment from "moment-timezone";

const profileRouter = Router();

profileRouter.get("/", authenticate, async (req: Request, res: Response) => {
  try {
    const profiles = await prisma.profiles.findMany(
      {
        include: {
          experiences: true,
          educations: true,
        },
      }
    );

    return res.status(200).send({
      success: true,
      message: "Profiles fetched successfully",
      data: {
        profiles,
      },
    });
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

profileRouter.get("/get-profile", authenticate, async (req: Request, res: Response) => {
  try {
    const { user } = req.body;

    const currentUser = await prisma.users.findUnique({
      select: {
        id: true,
        role: true,
        name: true,
      },
      where: {
        id: user.id 
      }
    });

    let where = {};
    if(currentUser?.role == "1") {
      where = {
        userId: user.id
      }
    }
    const profiles = await prisma.profiles.findMany(
      {
        select: {
          id: true,
          name: true,
        },
        where: where
      }
    );

    return res.status(200).send({
      success: true,
      message: "Profiles fetched successfully",
      data: {
        profiles,
      },
    });
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

profileRouter.post("/search-job", authenticate, async (req: Request, res: Response) => {
  try {
    const { companyName, jobTitle } = req.body;

    const jobs = await prisma.jobs.findMany({
      where: {
        company_name: companyName,
        title: jobTitle,
      },
      include: {
        profile: true,  // fetch related profile details
        user: true,     // fetch the user details using user_id
      },
    });
  
    if (!jobs || jobs.length === 0) {
      return res.status(200).send({
        success: true,
        message: "Jobs fetched successfully",
        data: {
          jobs: [],
        },
      });
    }
  
    // Map over the results to include only the desired fields
    jobs.map(job => ({
      title: job.title,
      description: job.description,
      profileName: job.profile.name,
      createdAt: job.createdAt,
      resumeUrl: job.resume,          // assuming resume field holds the download URL
      applicantName: job.user?.name,  // fetched via the user relation
    }));

    return res.status(200).send({
      success: true,
      message: "Jobs fetched successfully",
      data: {
        jobs,
      },
    });
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

profileRouter.get("/get-job-count", authenticate, async (req: Request, res: Response) => {
  try {
    const { user } = req.body;

    const currentUser = await prisma.users.findUnique({
      select: {
        id: true,
        role: true,
        name: true,
      },
      where: {
        id: user.id 
      }
    });

    const startOfTodayEST = moment().tz("America/New_York").startOf('day').toDate();
    const startOfTomorrowEST = moment().tz("America/New_York").startOf('day').add(1, 'day').toDate();

    // Build the base filter for jobs created today in EST
    const filter: any = {
      createdAt: {
        gte: startOfTodayEST,
        lt: startOfTomorrowEST,
      },
    };

    // If role is "1", limit to jobs of the logged-in user
    if (currentUser?.role === '1') {
      filter.user_id = currentUser?.id;
    }

    // Group jobs by user_id and profile_id, counting jobs per group
    const groupedCounts = await prisma.jobs.groupBy({
      by: ['profile_id', 'user_id'],
      where: filter,
      _count: { id: true },
    });

    // Get unique user and profile IDs from the grouping result
    const userIds = Array.from(new Set(groupedCounts.map(g => g.user_id)));
    const profileIds = Array.from(new Set(groupedCounts.map(g => g.profile_id)));

    // Fetch the user names for the corresponding user IDs
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    // Fetch the profile names for the corresponding profile IDs
    const profiles = await prisma.profiles.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, name: true },
    });

    // Create lookup maps for quick access to user and profile names
    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<string, string>);

    const profileMap = profiles.reduce((acc, p) => {
      acc[p.id] = p.name;
      return acc;
    }, {} as Record<string, string>);

    // Nest the grouped data by user and within each user, by profile
    const resultMap: Record<string, { user_id: string; user_name: string; profiles: any[] }> = {};

    groupedCounts.forEach(group => {
      const { user_id, profile_id, _count } = group;
      if (!resultMap[user_id]) {
        resultMap[user_id] = {
          user_id,
          user_name: userMap[user_id] || "",
          profiles: [],
        };
      }
      resultMap[user_id].profiles.push({
        profile_id,
        profile_name: profileMap[profile_id] || null,
        count: _count.id,
      });
    });

    // Convert the result map into an array
    const result = Object.values(resultMap);

    return res.status(200).send({
      success: true,
      message: "Profiles fetched successfully",
      data: {
        result,
      },
    });
  } catch (error: any) {
    console.log(error.message)
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
});

profileRouter.post(
  "/create",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { 
        name,
        dob,
        address,
        email,
        phone,
        linkedin,
        skills,
        educations,
        experiences,
        certifications
      } = req.body;

      const profile = await prisma.profiles.create({
        data: {
          name,
          dob,
          address,
          email,
          phone,
          linkedin,
          skills,
          educations: {
            create: educations
          },
          experiences: {
            create: experiences
          },
          certifications
        }
      });

      return res.status(201).send({
        success: true,
        message: "Profile created successfully",
        data: {
          profile,
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

profileRouter.put(
  "/update-user",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId, profileId } = req.body;

      const updatedProfile = await prisma.profiles.update({
        where: { id: profileId },
        data: {
          // If a userId is provided, connect the profile to that user.
          // If no userId is provided (or you want to remove the association), you could disconnect.
          user: userId ? { connect: { id: userId } } : { disconnect: true },
        },
      });

      return res.status(200).send({
        success: true,
        message: "Profile user updated successfully",
        data: updatedProfile,
      });
    } catch (error: any) {
      console.error(error.message);
      return res.status(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

profileRouter.delete(
  "/delete",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.body;

      await prisma.experiences.deleteMany({
        where: { profile_id: id },
      });
      
      // Delete related educations
      await prisma.educations.deleteMany({
        where: { profile_id: id },
      });

      const profile = await prisma.profiles.delete({
        where: {
          id: id,
        },
      });

      return res.status(200).send({
        success: true,
        message: "Profile deleted successfully",
        data: {
          profile,
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

export default profileRouter;