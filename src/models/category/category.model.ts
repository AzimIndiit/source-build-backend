import { Schema, model } from 'mongoose';
import { ICategoryDocument } from './category.types';

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
      unique: true
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
      unique: true,
      lowercase: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    },
    hasAttributes: {
      type: Boolean,
      default: false
    },
    attributes: [{
      name: {
        type: String,
        trim: true,
        maxlength: 100
      },
      inputType: {
        type: String,
        enum: ['text', 'number', 'dropdown', 'multiselect', 'boolean', 'radio']
      },
      required: {
        type: Boolean,
        default: false
      },
      values: [{
        value: { type: String, trim: true },
        order: { type: Number, default: 0 }
      }],
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }]
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
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ order: 1 });

// Virtual for subcategories count
categorySchema.virtual('subcategoriesCount', {
  ref: 'Subcategory',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Pre-save hook to generate slug
categorySchema.pre('save', function(next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Static methods
categorySchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

categorySchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

// Instance methods
categorySchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj.__v;
  return obj;
};

const Category = model<ICategoryDocument>('Category', categorySchema);

export default Category;