import { Types } from 'mongoose';
import { IContactUsMethods, IContactUs, ContactUsStatus } from './contactus.types.js';
import logger from '@config/logger.js';

export const contactUsMethods: IContactUsMethods = {
  markAsResolved: async function(
    this: IContactUs, 
    userId: Types.ObjectId, 
    notes?: string
  ): Promise<IContactUs> {
    this.status = ContactUsStatus.RESOLVED;
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    
    if (notes) {
      this.notes = notes;
    }
    
    await this.save();
    
    logger.info('Contact us ticket resolved', { 
      ticketId: this._id, 
      resolvedBy: userId 
    });
    
    return this;
  },

  markAsInProgress: async function(
    this: IContactUs, 
    userId: Types.ObjectId
  ): Promise<IContactUs> {
    if (this.status === ContactUsStatus.RESOLVED || this.status === ContactUsStatus.CLOSED) {
      throw new Error('Cannot mark resolved or closed ticket as in progress');
    }
    
    this.status = ContactUsStatus.IN_PROGRESS;
    this.resolvedBy = userId;
    
    await this.save();
    
    logger.info('Contact us ticket marked as in progress', { 
      ticketId: this._id, 
      assignedTo: userId 
    });
    
    return this;
  },

  markAsClosed: async function(
    this: IContactUs, 
    userId: Types.ObjectId, 
    notes?: string
  ): Promise<IContactUs> {
    this.status = ContactUsStatus.CLOSED;
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    
    if (notes) {
      this.notes = notes;
    }
    
    await this.save();
    
    logger.info('Contact us ticket closed', { 
      ticketId: this._id, 
      closedBy: userId 
    });
    
    return this;
  },

  reopenTicket: async function(
    this: IContactUs, 
    userId: Types.ObjectId
  ): Promise<IContactUs> {
    if (this.status === ContactUsStatus.PENDING || this.status === ContactUsStatus.IN_PROGRESS) {
      throw new Error('Ticket is already open');
    }
    
    this.status = ContactUsStatus.PENDING;
    this.resolvedBy = undefined;
    this.resolvedAt = undefined;
    this.notes = undefined;
    
    await this.save();
    
    logger.info('Contact us ticket reopened', { 
      ticketId: this._id, 
      reopenedBy: userId 
    });
    
    return this;
  },

  addNote: async function(
    this: IContactUs, 
    note: string, 
    userId: Types.ObjectId
  ): Promise<IContactUs> {
    const timestamp = new Date().toISOString();
    const noteWithTimestamp = `[${timestamp}] ${note}`;
    
    if (this.notes) {
      this.notes = `${this.notes}\n${noteWithTimestamp}`;
    } else {
      this.notes = noteWithTimestamp;
    }
    
    // Ensure notes don't exceed the limit
    if (this.notes.length > 500) {
      this.notes = this.notes.substring(this.notes.length - 500);
    }
    
    await this.save();
    
    logger.info('Note added to contact us ticket', { 
      ticketId: this._id, 
      addedBy: userId 
    });
    
    return this;
  },

  getFullName: function(this: IContactUs): string {
    return `${this.firstName} ${this.lastName}`;
  },
};