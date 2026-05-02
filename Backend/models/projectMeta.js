import mongoose from "mongoose";

const checkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "",
      trim: true,
    },
    passed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const projectMetaSchema = new mongoose.Schema(
  {
    repoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    repositoryName: {
      type: String,
      default: "",
      trim: true,
    },
    repositoryFullName: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    owner: {
      type: String,
      default: "",
      trim: true,
    },
    ownerAvatar: {
      type: String,
      default: "",
      trim: true,
    },
    language: {
      type: String,
      default: "Not specified",
      trim: true,
    },
    githubUrl: {
      type: String,
      default: "",
      trim: true,
    },
    demoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    screenshot: {
      type: String,
      default: "",
      trim: true,
    },
    visibility: {
      type: String,
      default: "public",
      trim: true,
    },
    private: {
      type: Boolean,
      default: false,
    },
    defaultBranch: {
      type: String,
      default: "",
      trim: true,
    },
    updatedAt: {
      type: String,
      default: "",
    },
    pushedAt: {
      type: String,
      default: "",
    },
    stars: {
      type: Number,
      default: 0,
      min: 0,
    },
    forks: {
      type: Number,
      default: 0,
      min: 0,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    team: {
      type: Number,
      default: 1,
      min: 1,
    },
    importOrder: {
      type: Number,
      default: 0,
      min: 0,
    },
    checks: {
      type: [checkSchema],
      default: [],
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const ProjectMeta = mongoose.models.ProjectMeta || mongoose.model("ProjectMeta", projectMetaSchema);

export default ProjectMeta;
