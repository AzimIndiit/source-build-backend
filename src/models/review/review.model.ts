import { Schema, model } from 'mongoose';
import {
  IReview,
  IReviewModel,
  ReviewType,
  ReviewStatus,
} from './review.types.js';

const ResponseSchema = new Schema({
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  respondedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const ReviewSchema = new Schema<IReview, IReviewModel>(
  {
   
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required'],
      index: true,
    },
   
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    images: [{
      type: String,
      trim: true,
    }],
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING,
      index: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
      index: true,
    },
    response: {
      type: ResponseSchema,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        const { __v, ...cleanRet } = ret;
        return cleanRet;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

// Compound indexes for better query performance
ReviewSchema.index({ type: 1, reviewee: 1, rating: 1 });
ReviewSchema.index({ type: 1, product: 1, rating: 1 });
ReviewSchema.index({ order: 1, type: 1 });
ReviewSchema.index({ createdAt: -1, status: 1 });
ReviewSchema.index({ reviewer: 1, type: 1, createdAt: -1 });

// Text index for search
ReviewSchema.index({ title: 'text', comment: 'text' });

// Virtual for helpfulness ratio
ReviewSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return (this.helpfulCount / total) * 100;
});

// Instance methods
ReviewSchema.methods.markAsHelpful = async function(userId: string): Promise<void> {
  this.helpfulCount += 1;
  await this.save();
};

ReviewSchema.methods.markAsNotHelpful = async function(userId: string): Promise<void> {
  this.notHelpfulCount += 1;
  await this.save();
};

ReviewSchema.methods.approve = async function(): Promise<void> {
  this.status = ReviewStatus.APPROVED;
  await this.save();
};

ReviewSchema.methods.reject = async function(reason: string): Promise<void> {
  this.status = ReviewStatus.REJECTED;
  await this.save();
};

ReviewSchema.methods.flag = async function(reason: string): Promise<void> {
  this.status = ReviewStatus.FLAGGED;
  await this.save();
};

ReviewSchema.methods.addResponse = async function(comment: string, responderId: string): Promise<void> {
  this.response = {
    comment,
    respondedBy: responderId as any,
    respondedAt: new Date(),
  };
  await this.save();
};

// Static methods
ReviewSchema.statics.findByOrder = function(orderId) {
  return this.find({ order: orderId, status: ReviewStatus.APPROVED })
    .populate('reviewer', 'firstName lastName avatar')
    .populate('reviewee', 'firstName lastName avatar');
};

ReviewSchema.statics.findByProduct = function(productId) {
  return this.find({ product: productId, status: ReviewStatus.APPROVED })
    .populate('reviewer', 'firstName lastName avatar')
    .sort('-createdAt');
};

ReviewSchema.statics.findByReviewer = function(reviewerId) {
  return this.find({ reviewer: reviewerId })
    .populate('product', 'title images price')
    .populate('reviewee', 'firstName lastName avatar')
    .sort('-createdAt');
};

ReviewSchema.statics.findByReviewee = function(revieweeId) {
  return this.find({ reviewee: revieweeId, status: ReviewStatus.APPROVED })
    .populate('reviewer', 'firstName lastName avatar')
    .sort('-createdAt');
};

ReviewSchema.statics.getAverageRating = async function(targetId, type) {
  const result = await this.aggregate([
    {
      $match: {
        $or: [
          { product: targetId },
          { reviewee: targetId },
        ],
        type: type,
        status: ReviewStatus.APPROVED,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
      },
    },
  ]);
  
  return result[0]?.averageRating || 0;
};

ReviewSchema.statics.getReviewStats = async function(targetId, type) {
  const [stats] = await this.aggregate([
    {
      $match: {
        $or: [
          { product: targetId },
          { reviewee: targetId },
        ],
        type: type,
        status: ReviewStatus.APPROVED,
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        total: { $sum: 1 },
        ratings: { $push: '$rating' },
      },
    },
    {
      $project: {
        _id: 0,
        average: { $round: ['$average', 1] },
        total: 1,
        distribution: {
          $arrayToObject: {
            $map: {
              input: [1, 2, 3, 4, 5],
              as: 'star',
              in: {
                k: { $toString: '$$star' },
                v: {
                  $size: {
                    $filter: {
                      input: '$ratings',
                      cond: { $eq: ['$$this', '$$star'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);

  return stats || {
    average: 0,
    total: 0,
    distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  };
};

// Pre-save middleware
ReviewSchema.pre('save', async function(next) {
  // Verify purchase if order is provided
  if (this.isNew && this.order) {
    const Order = model('Order');
    const order = await Order.findById(this.order);
    if (order) {
      this.isVerifiedPurchase = true;
    }
  }
  
  next();
});

// Post-save middleware to update related model ratings
ReviewSchema.post('save', async function() {
  if (this.status === ReviewStatus.APPROVED) {
    if (this.type === ReviewType.PRODUCT && this.product) {
      const Product = model('Product');
      const stats = await (this.constructor as IReviewModel).getReviewStats(
        this.product,
        ReviewType.PRODUCT
      );
      await Product.findByIdAndUpdate(this.product, {
        rating: stats.average,
        totalReviews: stats.total,
      });
    }
    
    if ((this.type === ReviewType.CUSTOMER || this.type === ReviewType.DRIVER) && this.reviewee) {
      const User = model('User');
      const stats = await (this.constructor as IReviewModel).getReviewStats(
        this.reviewee,
        this.type
      );
      await User.findByIdAndUpdate(this.reviewee, {
        [`${this.type}Rating`]: stats.average,
        [`${this.type}ReviewCount`]: stats.total,
      });
    }
  }
});

// Create and export the model
const Review = model<IReview, IReviewModel>('Review', ReviewSchema);

export default Review;