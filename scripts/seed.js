const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/User");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const connectDB = require("../config/database");

// Load env vars
dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Category.deleteMany({});
    await Tag.deleteMany({});

    // Create admin user
    console.log("Creating admin user...");
    const adminUser = await User.create({
      name: "Admin User",
      email: "admin@blogapi.com",
      password: "Admin123",
      role: "admin",
      bio: "Blog administrator with full access to manage all content and users.",
    });

    // Create editor user
    console.log("Creating editor user...");
    const editorUser = await User.create({
      name: "Editor User",
      email: "editor@blogapi.com",
      password: "Editor123",
      role: "editor",
      bio: "Blog editor responsible for creating and managing posts and comments.",
    });

    // Create regular user
    console.log("Creating regular user...");
    const regularUser = await User.create({
      name: "John Doe",
      email: "user@blogapi.com",
      password: "User123",
      role: "user",
      bio: "A regular blog reader who enjoys commenting and engaging with content.",
    });

    // Create categories
    console.log("Creating categories...");
    const categories = await Category.create([
      {
        name: "Technology",
        description: "Latest trends and news in technology",
        color: "#3B82F6",
      },
      {
        name: "Programming",
        description: "Programming tutorials, tips, and best practices",
        color: "#10B981",
      },
      {
        name: "Web Development",
        description: "Frontend and backend web development topics",
        color: "#8B5CF6",
      },
      {
        name: "Mobile",
        description: "Mobile app development and design",
        color: "#F59E0B",
      },
      {
        name: "AI & Machine Learning",
        description: "Artificial intelligence and machine learning insights",
        color: "#EF4444",
      },
    ]);

    // Create tags
    console.log("Creating tags...");
    const tags = await Tag.create([
      { name: "JavaScript", color: "#F7DF1E" },
      { name: "Python", color: "#3776AB" },
      { name: "React", color: "#61DAFB" },
      { name: "Node.js", color: "#339933" },
      { name: "MongoDB", color: "#47A248" },
      { name: "Express.js", color: "#000000" },
      { name: "API", color: "#FF6B35" },
      { name: "Tutorial", color: "#6366F1" },
      { name: "Best Practices", color: "#10B981" },
      { name: "Beginner", color: "#F59E0B" },
      { name: "Advanced", color: "#EF4444" },
      { name: "Frontend", color: "#8B5CF6" },
      { name: "Backend", color: "#6B7280" },
      { name: "Full Stack", color: "#1F2937" },
      { name: "DevOps", color: "#0EA5E9" },
    ]);

    console.log("\n✅ Seed data created successfully!");
    console.log("\n📧 Login Credentials:");
    console.log("👑 Admin: admin@blogapi.com / Admin123");
    console.log("✏️  Editor: editor@blogapi.com / Editor123");
    console.log("👤 User: user@blogapi.com / User123");

    console.log("\n📊 Created:");
    console.log(`- ${3} users`);
    console.log(`- ${categories.length} categories`);
    console.log(`- ${tags.length} tags`);

    console.log("\n🚀 You can now start the server and begin using the API!");
    console.log("📖 API Documentation: http://localhost:3000/api-docs");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding data:", error.message);
    process.exit(1);
  }
};

// Run seeder
seedData();
