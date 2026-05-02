import mongoose from "../../Frontend/node_modules/mongoose/index.js";
import ProjectMeta from "../models/projectMeta.js";

const mongoURL = "mongodb://localhost:27017/userdata";

const libraryManagementSystemProject = {
  repoId: "1225697756",
  name: "Library-Management-System",
  repositoryName: "Library-Management-System",
  repositoryFullName: "waravignesh3/Library-Management-System",
  description: "Library Management System – Web Application. A modern and efficient web-based Library Management System designed to streamline and automate the day-to-day operations of libraries.",
  owner: "waravignesh3",
  ownerAvatar: "https://avatars.githubusercontent.com/u/254257836?v=4",
  language: "JavaScript",
  githubUrl: "https://github.com/waravignesh3/Library-Management-System",
  demoUrl: "",
  screenshot: "https://repository-images.githubusercontent.com/1225697756/placeholder.jpg",
  visibility: "public",
  private: false,
  defaultBranch: "main",
  updatedAt: "2026-05-01T14:48:59Z",
  pushedAt: "2026-04-30T14:45:39Z",
  stars: 0,
  forks: 0,
  progress: 75,
  team: 2,
  importOrder: 0,
  checks: [
    {
      label: "Frontend Completed",
      passed: true,
    },
    {
      label: "Backend Completed",
      passed: true,
    },
    {
      label: "Database Configured",
      passed: true,
    },
  ],
  lastSyncedAt: new Date(),
};

async function importProject() {
  try {
    await mongoose.connect(mongoURL);
    console.log("Connected to MongoDB");

    // Check if project already exists
    const existingProject = await ProjectMeta.findOne({ repoId: libraryManagementSystemProject.repoId });
    
    if (existingProject) {
      console.log("Project already exists. Updating...");
      await ProjectMeta.updateOne(
        { repoId: libraryManagementSystemProject.repoId },
        { $set: libraryManagementSystemProject }
      );
      console.log("✓ Project updated successfully!");
    } else {
      console.log("Creating new project...");
      const newProject = new ProjectMeta(libraryManagementSystemProject);
      await newProject.save();
      console.log("✓ Project imported successfully!");
    }

    // Verify the project was saved
    const savedProject = await ProjectMeta.findOne({ repoId: libraryManagementSystemProject.repoId });
    console.log("\n📦 Saved Project Details:");
    console.log(`   Name: ${savedProject.name}`);
    console.log(`   Owner: ${savedProject.owner}`);
    console.log(`   Description: ${savedProject.description}`);
    console.log(`   Language: ${savedProject.language}`);
    console.log(`   Progress: ${savedProject.progress}%`);
    console.log(`   Status: ${savedProject.checks.every(c => c.passed) ? 'Completed' : 'In Progress'}`);
    console.log(`   GitHub URL: ${savedProject.githubUrl}`);

    await mongoose.disconnect();
    console.log("\n✓ MongoDB connection closed");
  } catch (error) {
    console.error("Error importing project:", error);
    process.exit(1);
  }
}

importProject();
