import { Document, Types, Model } from 'mongoose';

export enum ContactUsStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface IContactUs extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  status: ContactUsStatus;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContactUsMethods {
  markAsResolved(userId: Types.ObjectId, notes?: string): Promise<IContactUs>;
  markAsInProgress(userId: Types.ObjectId): Promise<IContactUs>;
  markAsClosed(userId: Types.ObjectId, notes?: string): Promise<IContactUs>;
  reopenTicket(userId: Types.ObjectId): Promise<IContactUs>;
  addNote(note: string, userId: Types.ObjectId): Promise<IContactUs>;
  getFullName(): string;
}

export interface IContactUsModel extends Model<IContactUs> {
  findByStatus(status: ContactUsStatus): Promise<IContactUs[]>;
  findByEmail(email: string): Promise<IContactUs[]>;
  findPending(): Promise<IContactUs[]>;
  findResolved(startDate?: Date, endDate?: Date): Promise<IContactUs[]>;
  getStatistics(period?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
  searchTickets(query: string): Promise<IContactUs[]>;
}

// DTOs for API operations
export interface CreateContactUsDTO {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

export interface UpdateContactUsDTO {
  status?: ContactUsStatus;
  notes?: string;
  resolvedBy?: string;
}

export interface ContactUsFilterDTO {
  status?: ContactUsStatus;
  email?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sort?: string;
}