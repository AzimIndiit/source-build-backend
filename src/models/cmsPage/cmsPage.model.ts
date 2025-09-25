import mongoose, { Document, Schema } from 'mongoose';

export interface ICmsPage extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  isLandingPage: boolean;
  sections?: ILandingSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ILandingSection {
  id: string;
  type: 'hero' | 'deals' | 'products' | 'categories' | 'features';
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  items?: Array<{
    title: string;
    image?: string;
    price?: string;
    priceType?: 'sqft' | 'linear' | 'pallet' | string;
    readyByDays?: string;
    link?: string;
    description?: string;
    location?: string;
    seller?: string;
  }>;
  productIds?: string[]; // Store only product IDs
  categoryIds?: string[]; // Store only category IDs
  order: number;
}

const landingSectionSchema = new Schema<ILandingSection>(
  {
    id: {
      type: String,
      required: true,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    type: {
      type: String,
      required: true,
      enum: ['hero', 'deals', 'products', 'categories', 'features'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    backgroundImage: {
      type: String,
      trim: true,
    },
    items: [
      {
        title: {
          type: String,
          trim: true,
          maxlength: 200,
        },
        image: {
          type: String,
          trim: true,
        },
        price: {
          type: String,
          trim: true,
        },
        priceType: {
          type: String,
          trim: true,
          enum: ['sqft', 'linear', 'pallet', ''],
          default: '',
        },
        readyByDays: {
          type: String,
          trim: true,
        },
        link: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
          maxlength: 500,
        },
        location: {
          type: String,
          trim: true,
          maxlength: 200,
        },
        seller: {
          type: String,
          trim: true,
          maxlength: 200,
        },
      },
    ],
    productIds: [{
      type: String,
      trim: true,
    }],
    categoryIds: [{
      type: String,
      trim: true,
    }],
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const cmsPageSchema = new Schema<ICmsPage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 50000,
    },
    isLandingPage: {
      type: Boolean,
      default: false,
    },
    sections: [landingSectionSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for unique slug per user
cmsPageSchema.index({ userId: 1, slug: 1 }, { unique: true });

// Generate slug from title if not provided
cmsPageSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

const CmsPage = mongoose.model<ICmsPage>('CmsPage', cmsPageSchema);

export default CmsPage;