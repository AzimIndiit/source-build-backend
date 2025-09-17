import { Schema, model } from 'mongoose'
import { 
  IQuoteDocument, 
  QuoteStatus, 
  ProjectType, 
  InstallationLocation,
  ExistingDesign,
  CabinetStyle,
  Material,
  FinishColor
} from './quote.types.js'

const quoteSchema = new Schema<IQuoteDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(QuoteStatus),
      default: QuoteStatus.PENDING,
      index: true
    },
    
    // Project Details
    projectType: {
      type: String,
      enum: Object.values(ProjectType),
      required: true
    },
    installationLocation: {
      type: String,
      enum: Object.values(InstallationLocation),
      required: true
    },
    spaceWidth: {
      type: Number,
      required: true,
      min: 0
    },
    spaceHeight: {
      type: Number,
      required: true,
      min: 0
    },
    existingDesign: {
      type: String,
      enum: Object.values(ExistingDesign),
      required: true
    },
    
    // Cabinet Details
    cabinetStyle: {
      type: String,
      enum: Object.values(CabinetStyle),
      required: true
    },
    material: {
      type: String,
      enum: Object.values(Material),
      required: true
    },
    finishColor: {
      type: String,
      enum: Object.values(FinishColor),
      required: true
    },
    
    // Additional Information
    additionalComments: {
      type: String,
      maxlength: 2000
    },
    images: [{
      type: String
    }],
    
    // Quote Response (filled by admin/seller)
    quotedPrice: {
      type: Number,
      min: 0
    },
    estimatedTime: {
      type: String
    },
    responseNotes: {
      type: String,
      maxlength: 2000
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      }
    },
    toObject: { virtuals: true }
  }
)

// Indexes for better query performance
quoteSchema.index({ user: 1, createdAt: -1 })
quoteSchema.index({ status: 1, createdAt: -1 })
quoteSchema.index({ createdAt: -1 })

// Virtual for space area calculation
quoteSchema.virtual('spaceArea').get(function() {
  return this.spaceWidth * this.spaceHeight
})

// Pre-save middleware to set respondedAt when status changes to completed
quoteSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === QuoteStatus.COMPLETED && !this.respondedAt) {
    this.respondedAt = new Date()
  }
  next()
})

const QuoteModel = model<IQuoteDocument>('Quote', quoteSchema)

export default QuoteModel