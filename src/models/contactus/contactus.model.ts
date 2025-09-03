import { Schema, model } from 'mongoose';
import { 
  IContactUs, 
  IContactUsMethods, 
  IContactUsModel,
  ContactUsStatus
} from './contactus.types.js';
import { contactUsMethods } from './contactus.methods.js';
import { contactUsStatics } from './contactus.statics.js';

const ContactUsSchema = new Schema<IContactUs, IContactUsModel, IContactUsMethods>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name must not exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name must not exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [100, 'Email must not exceed 100 characters'],
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [1000, 'Message must not exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(ContactUsStatus),
      default: ContactUsStatus.PENDING,
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes must not exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Indexes for better query performance
ContactUsSchema.index({ createdAt: -1 });
ContactUsSchema.index({ email: 1, createdAt: -1 });
ContactUsSchema.index({ status: 1, createdAt: -1 });
ContactUsSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  email: 'text', 
  message: 'text' 
});

// Virtual for full name
ContactUsSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if ticket is open
ContactUsSchema.virtual('isOpen').get(function() {
  return this.status === ContactUsStatus.PENDING || this.status === ContactUsStatus.IN_PROGRESS;
});

// Virtual to check if ticket is resolved
ContactUsSchema.virtual('isResolved').get(function() {
  return this.status === ContactUsStatus.RESOLVED || this.status === ContactUsStatus.CLOSED;
});

// Virtual for response time in hours
ContactUsSchema.virtual('responseTimeHours').get(function() {
  if (!this.resolvedAt) return null;
  const created = new Date(this.createdAt).getTime();
  const resolved = new Date(this.resolvedAt).getTime();
  return Math.round((resolved - created) / (1000 * 60 * 60));
});

// Pre-save middleware
ContactUsSchema.pre('save', function(next) {
  // Auto-set resolvedAt when status changes to resolved or closed
  if (this.isModified('status')) {
    if (this.status === ContactUsStatus.RESOLVED || this.status === ContactUsStatus.CLOSED) {
      this.resolvedAt = new Date();
    } else if (this.status === ContactUsStatus.PENDING || this.status === ContactUsStatus.IN_PROGRESS) {
      this.resolvedAt = null as any;
    }
  }
  next();
});

// Post-save middleware for population
ContactUsSchema.post('save', async function(doc) {
  if (doc.resolvedBy) {
    await doc.populate('resolvedBy', 'firstName lastName email');
  }
});

// Instance methods
Object.assign(ContactUsSchema.methods, contactUsMethods);

// Static methods
Object.assign(ContactUsSchema.statics, contactUsStatics);

// Create and export the model
const ContactUsModal = model<IContactUs, IContactUsModel>('ContactUs', ContactUsSchema);

export default ContactUsModal;