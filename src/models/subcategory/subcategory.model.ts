import { Schema, model, Types } from 'mongoose';
import { ISubcategoryDocument } from './subcategory.types';

const subcategorySchema = new Schema<ISubcategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'Subcategory name is required'],
      trim: true,
      maxlength: [100, 'Subcategory name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
      type: String,
      trim: true
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes
subcategorySchema.index({ name: 1, category: 1 }, { unique: true });
subcategorySchema.index({ slug: 1, category: 1 }, { unique: true });
subcategorySchema.index({ category: 1 });
subcategorySchema.index({ isActive: 1 });
subcategorySchema.index({ order: 1 });

// Pre-save hook to generate slug
subcategorySchema.pre('save', function(next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Static methods
subcategorySchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true }).populate('category');
};

subcategorySchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .populate('category')
    .sort({ order: 1, name: 1 });
};

subcategorySchema.statics.findByCategory = function(categoryId: string) {
  return this.find({ category: categoryId, isActive: true })
    .sort({ order: 1, name: 1 });
};

// Instance methods
subcategorySchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj.__v;
  return obj;
};

const Subcategory = model<ISubcategoryDocument>('Subcategory', subcategorySchema);

export default Subcategory;