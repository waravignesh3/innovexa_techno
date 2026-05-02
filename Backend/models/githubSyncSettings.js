import mongoose from "mongoose";

const githubSyncSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    owners: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const GithubSyncSettings = mongoose.models.GithubSyncSettings
  || mongoose.model("GithubSyncSettings", githubSyncSettingsSchema);

export default GithubSyncSettings;
