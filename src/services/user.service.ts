import UserModal from '@models/user/user.model.js';
import ApiError from '@utils/ApiError.js';
import logger from '@config/logger.js';
import { IUser, UserFilterDTO, UserStatus } from '@models/user/user.types.js';

class UserService {


  async getUsers(filters: UserFilterDTO, userId?: string, userRole?: string): Promise<{
    users: IUser[];
    pagination: any;
    stats?: {
      total: number;
      active: number;
      inactive: number;
      pending: number;
      deleted: number;
    };
  }> {
    try {
      const query: any = {};
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      // Exclude deleted users by default unless specifically requested
      if (filters.status) {
        query.status = filters.status;
      } else {
        query.status = { $ne: UserStatus.DELETED };
      }
      
      if (filters.role) query.role = filters.role;

      // Build date filter object separately to avoid mutation issues
      const dateFilter: any = {};
      if (filters.startDate) {
        const startDateStr = typeof filters.startDate === 'string' ? filters.startDate : filters.startDate.toISOString();
        // If date string is in YYYY-MM-DD format, parse it as local date
        if (startDateStr.length === 10) { // YYYY-MM-DD format
          // Parse as UTC date at start of day to avoid timezone issues
          dateFilter.$gte = new Date(startDateStr + 'T00:00:00.000Z');
        } else {
          // Handle full datetime strings
          dateFilter.$gte = new Date(startDateStr);
        }
      }
      if (filters.endDate) {
        const endDateStr = typeof filters.endDate === 'string' ? filters.endDate : filters.endDate.toISOString();
        // If date string is in YYYY-MM-DD format, parse it as local date
        if (endDateStr.length === 10) { // YYYY-MM-DD format
          // Parse as UTC date at end of day to avoid timezone issues
          dateFilter.$lte = new Date(endDateStr + 'T23:59:59.999Z');
        } else {
          // Handle full datetime strings
          dateFilter.$lte = new Date(endDateStr);
        }
      }
      
      // Only add createdAt filter if we have date filters
      if (Object.keys(dateFilter).length > 0) {
        query.createdAt = dateFilter;
      }

      if (filters.search) {
        query.$or = [
          { email: { $regex: filters.search, $options: 'i' } },
          { displayName: { $regex: filters.search, $options: 'i' } },
          { phone: { $regex: filters.search, $options: 'i' } }
        ];
      }

      if (userRole === 'admin' && userId) {
        // Admin can see all users, but can filter by specific user if needed
        if (filters.userId) {
          query._id = filters.userId;
        }
      } else if (userId) {
        // Non-admin users can only see themselves
        query._id = userId;
      }

      const sort: any = {};
      if (filters.sort) {
        // Handle MongoDB-style sort parameter (e.g., "-createdAt" or "displayName")
        if (filters.sort.startsWith('-')) {
          sort[filters.sort.substring(1)] = -1; // Descending
        } else if (filters.sort.includes(':')) {
          // Legacy format support
          const [field, order] = filters.sort.split(':');
          sort[field] = order === 'desc' ? -1 : 1;
        } else {
          sort[filters.sort] = 1; // Ascending
        }
      } else {
        sort.createdAt = -1;
      }
      // Debug logging for query construction
      logger.debug('MongoDB query constructed:', {
        email: query.email,
        role: query.role,
        status: query.status,
        createdAt: query.createdAt
      });
      
      // Build base query for stats (without pagination)
      const baseStatsQuery: any = {};
      if (filters.role) baseStatsQuery.role = filters.role;
      
      // Execute all queries in parallel
      const [users, total, stats] = await Promise.all([
        UserModal.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-password -refreshToken')
          .lean(),
        UserModal.countDocuments(query),
        // Get stats only for the specific role if filtered
        this.getUserStats(baseStatsQuery),
      ]);
      
      logger.debug(`Query results: Found ${users.length} users out of ${total} total matching the query`);
      const totalPages = Math.ceil(total / limit);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        stats,
      };
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserStats(baseQuery: any = {}): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    deleted: number;
  }> {
    try {
      // Exclude deleted users from total count by default
      const matchQuery = { 
        ...baseQuery,
        status: { $ne: UserStatus.DELETED } 
      };

      const pipeline: any[] = [
        // Match stage - apply base query filters and exclude deleted
        { $match: matchQuery },
        
        // Group stage - count by status and get total
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            inactive: {
              $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            }
          }
        }
      ];

      const result = await UserModal.aggregate(pipeline);
      
      // Count deleted users separately
      const deletedCount = await UserModal.countDocuments({ 
        ...baseQuery, 
        status: UserStatus.DELETED 
      });
      
      // If no users match the query, return zeros
      if (result.length === 0) {
        return {
          total: 0,
          active: 0,
          inactive: 0,
          pending: 0,
          deleted: deletedCount,
        };
      }

      // Return the aggregated stats
      const stats = result[0];
      return {
        total: stats.total || 0,
        active: stats.active || 0,
        inactive: stats.inactive || 0,
        pending: stats.pending || 0,
        deleted: deletedCount,
      };
    } catch (error) {
      logger.error('Error fetching user stats:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<IUser> {
    try {
      let user: IUser | null = null;
      
      // Check if userId is a valid ObjectId
      if (userId.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a valid ObjectId format, try to find by _id
        user = await UserModal.findById(userId)
          .select('-password -refreshToken')
          .lean();
      }
      
      // If not found by _id or not a valid ObjectId, try by email
      if (!user) {
        user = await UserModal.findOne({ email: userId })
          .select('-password -refreshToken')
          .lean();
      }

      if (!user) {
        throw ApiError.notFound('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error fetching user:', error);
      throw error;
    }
  }

  async blockUser(userId: string): Promise<IUser> {
    try {
      const user = await UserModal.findById(userId);
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (user.status === UserStatus.INACTIVE) {
        throw ApiError.badRequest('User is already blocked');
      }

      // Update user status to suspended (blocked)
      user.status = UserStatus.INACTIVE;
      await user.save();

      logger.info(`User ${userId} has been blocked`);
      return user;
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  async unblockUser(userId: string): Promise<IUser> {
    try {
      const user = await UserModal.findById(userId);
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      if (user.status !== UserStatus.INACTIVE) {
        throw ApiError.badRequest('User is not blocked');
      }

      // Update user status to active (unblocked)
      user.status = UserStatus.ACTIVE;
      await user.save();

      logger.info(`User ${userId} has been unblocked`);
      return user;
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  async softDeleteUser(userId: string): Promise<{ message: string }> {
    try {
      const user = await UserModal.findById(userId);
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Soft delete by changing status to inactive
      user.status = UserStatus.DELETED;
      
      await user.save();

      logger.info(`User ${userId} has been soft deleted`);
      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async restoreUser(userId: string): Promise<IUser> {
    try {
      const user = await UserModal.findById(userId);
      
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Check if user is deleted (email starts with "deleted_")
      if (!user.email.startsWith('deleted_')) {
        throw ApiError.badRequest('User is not deleted');
      }

      // Restore user by setting status to active
      user.status = UserStatus.ACTIVE;
      
      // Note: Cannot restore original email/name/phone after anonymization
      // Admin would need to manually update these fields
      
      await user.save();

      logger.info(`User ${userId} has been restored`);
      return user;
    } catch (error) {
      logger.error('Error restoring user:', error);
      throw error;
    }
  }
}

export default new UserService();