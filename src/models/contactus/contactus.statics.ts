import { Model, Types } from 'mongoose';
import { IContactUs, ContactUsStatus } from './contactus.types.js';

export const contactUsStatics = {
  async findByStatus(this: Model<IContactUs>, status: ContactUsStatus): Promise<IContactUs[]> {
    return this.find({ status })
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  },

  async findByEmail(this: Model<IContactUs>, email: string): Promise<IContactUs[]> {
    return this.find({ email: email.toLowerCase() })
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  },

  async findPending(this: Model<IContactUs>): Promise<IContactUs[]> {
    return this.find({ 
      status: { $in: [ContactUsStatus.PENDING, ContactUsStatus.IN_PROGRESS] }
    })
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: 1 }); // Oldest first for pending tickets
  },

  async findResolved(
    this: Model<IContactUs>, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<IContactUs[]> {
    const query: any = { 
      status: { $in: [ContactUsStatus.RESOLVED, ContactUsStatus.CLOSED] }
    };
    
    if (startDate || endDate) {
      query.resolvedAt = {};
      if (startDate) query.resolvedAt.$gte = startDate;
      if (endDate) query.resolvedAt.$lte = endDate;
    }
    
    return this.find(query)
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ resolvedAt: -1 });
  },

  async getStatistics(
    this: Model<IContactUs>, 
    period?: 'day' | 'week' | 'month' | 'year'
  ): Promise<any> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }
    
    const stats = await this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          pendingTickets: {
            $sum: {
              $cond: [{ $eq: ['$status', ContactUsStatus.PENDING] }, 1, 0],
            },
          },
          inProgressTickets: {
            $sum: {
              $cond: [{ $eq: ['$status', ContactUsStatus.IN_PROGRESS] }, 1, 0],
            },
          },
          resolvedTickets: {
            $sum: {
              $cond: [{ $eq: ['$status', ContactUsStatus.RESOLVED] }, 1, 0],
            },
          },
          closedTickets: {
            $sum: {
              $cond: [{ $eq: ['$status', ContactUsStatus.CLOSED] }, 1, 0],
            },
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalTickets: 1,
          pendingTickets: 1,
          inProgressTickets: 1,
          resolvedTickets: 1,
          closedTickets: 1,
          openTickets: { $add: ['$pendingTickets', '$inProgressTickets'] },
          resolvedRate: {
            $cond: [
              { $eq: ['$totalTickets', 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      { $add: ['$resolvedTickets', '$closedTickets'] },
                      '$totalTickets',
                    ],
                  },
                  100,
                ],
              },
            ],
          },
          avgResponseTimeHours: {
            $cond: [
              { $eq: ['$avgResponseTime', null] },
              null,
              { $divide: ['$avgResponseTime', 3600000] }, // Convert ms to hours
            ],
          },
        },
      },
    ]);
    
    // Get top email domains
    const emailDomains = await this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $project: {
          domain: { $substr: ['$email', { $indexOfBytes: ['$email', '@'] }, -1] },
        },
      },
      {
        $group: {
          _id: '$domain',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
    ]);
    
    return {
      ...stats[0] || {
        totalTickets: 0,
        pendingTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        closedTickets: 0,
        openTickets: 0,
        resolvedRate: 0,
        avgResponseTimeHours: null,
      },
      topEmailDomains: emailDomains,
      period,
    };
  },

  async searchTickets(this: Model<IContactUs>, query: string): Promise<IContactUs[]> {
    return this.find({
      $or: [
        { firstName: new RegExp(query, 'i') },
        { lastName: new RegExp(query, 'i') },
        { email: new RegExp(query, 'i') },
        { message: new RegExp(query, 'i') },
        { notes: new RegExp(query, 'i') },
      ],
    })
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(50);
  },
};