import { Document, Types, Model } from 'mongoose';

export enum ReviewType {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  PRODUCT = 'product',
  SELLER = 'seller',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

export interface IReview extends Document {
  type: ReviewType;
  order?: Types.ObjectId;
  product?: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee?: Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  helpfulCount: number;
  notHelpfulCount: number;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  response?: {
    comment: string;
    respondedBy: Types.ObjectId;
    respondedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewMethods {
  markAsHelpful(userId: string): Promise<void>;
  markAsNotHelpful(userId: string): Promise<void>;
  approve(): Promise<void>;
  reject(reason: string): Promise<void>;
  flag(reason: string): Promise<void>;
  addResponse(comment: string, responderId: string): Promise<void>;
}

export interface IReviewModel extends Model<IReview, {}, IReviewMethods> {
  findByOrder(orderId: Types.ObjectId): Promise<IReview[]>;
  findByProduct(productId: Types.ObjectId): Promise<IReview[]>;
  findByReviewer(reviewerId: Types.ObjectId): Promise<IReview[]>;
  findByReviewee(revieweeId: Types.ObjectId): Promise<IReview[]>;
  getAverageRating(targetId: Types.ObjectId, type: ReviewType): Promise<number>;
  getReviewStats(targetId: Types.ObjectId, type: ReviewType): Promise<{
    average: number;
    total: number;
    distribution: Record<number, number>;
  }>;
}

export interface CreateReviewDTO {
  type: ReviewType;
  order?: string;
  product?: string;
  reviewer: string;
  reviewee?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isVerifiedPurchase?: boolean;
}

export interface UpdateReviewDTO {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
  status?: ReviewStatus;
}

export interface ReviewFilterDTO {
  type?: ReviewType;
  status?: ReviewStatus;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  reviewer?: string;
  reviewee?: string;
  order?: string;
  product?: string;
  isVerifiedPurchase?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}