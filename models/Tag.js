const mongoose = require("mongoose");

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a tag name"],
      unique: true,
      trim: true,
      maxlength: [30, "Tag name cannot be more than 30 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    color: {
      type: String,
      default: "#10B981",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Generate slug from name before saving
tagSchema.pre("save", function (next) {
  if (this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

module.exports = mongoose.model("Tag", tagSchema);
