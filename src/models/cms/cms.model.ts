import mongoose, { Document, Schema } from 'mongoose';

export enum ContentType {
  TERMS_CONDITIONS = 'terms_conditions',
  PRIVACY_POLICY = 'privacy_policy',
  ABOUT_US = 'about_us',
}

export interface ICmsContent extends Document {
  userId: mongoose.Types.ObjectId;
  type: ContentType;
  title: string;
  content: string;
  isActive: boolean;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cmsContentSchema = new Schema<ICmsContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ContentType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 50000, // Allow up to 50k characters for content
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique content type per user
cmsContentSchema.index({ userId: 1, type: 1 }, { unique: true });

// Update lastUpdated on save
cmsContentSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

const CmsContent = mongoose.model<ICmsContent>('CmsContent', cmsContentSchema);

export default CmsContent;