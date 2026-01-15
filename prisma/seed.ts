import "dotenv/config";
import { ConfigService } from "../src/config";
import { PrismaService } from "../src/services/database/prisma.service";

async function main() {
  console.log("🌱 Starting seed...");

  // Initialize config and database services
  const config = ConfigService.getInstance();
  const prismaService = new PrismaService(config);

  try {
    // Connect to database
    await prismaService.connect();
    console.log("✅ Database connected");

    const prisma = prismaService.client;

    // Create sample users
    const users = [
      {
        email: "john.doe@example.com",
        name: "John Doe",
      },
      {
        email: "jane.smith@example.com",
        name: "Jane Smith",
      },
      {
        email: "bob.wilson@example.com",
        name: "Bob Wilson",
      },
      {
        email: "alice.johnson@example.com",
        name: "Alice Johnson",
      },
    ];

    // Upsert users (create if not exists, skip if exists)
    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: userData,
      });
      console.log(`✅ Created/found user: ${user.email} (${user.id})`);
    }

    console.log("✨ Seed completed successfully!");
  } finally {
    // Ensure proper cleanup
    await prismaService.disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Error seeding database:", e);
  process.exit(1);
});
