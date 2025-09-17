import { z } from 'zod'
import { 
  QuoteStatus, 
  ProjectType, 
  InstallationLocation,
  ExistingDesign,
  CabinetStyle,
  Material,
  FinishColor
} from './quote.types.js'

// Create quote request schema
export const createQuoteSchema = z.object({
  projectType: z.enum(Object.values(ProjectType) as [ProjectType, ...ProjectType[]], {
    required_error: 'Project type is required',
    invalid_type_error: 'Invalid project type'
  }),
  
  installationLocation: z.enum(Object.values(InstallationLocation) as [InstallationLocation, ...InstallationLocation[]], {
    required_error: 'Installation location is required',
    invalid_type_error: 'Invalid installation location'
  }),
  
  spaceWidth: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Width must be a valid number')
    .min(1, 'Space width is required'),
  
  spaceHeight: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Height must be a valid number')
    .min(1, 'Space height is required'),
  
  existingDesign: z.enum(Object.values(ExistingDesign) as [ExistingDesign, ...ExistingDesign[]], {
    required_error: 'Existing design information is required',
    invalid_type_error: 'Invalid existing design option'
  }),
  
  cabinetStyle: z.enum(Object.values(CabinetStyle) as [CabinetStyle, ...CabinetStyle[]], {
    required_error: 'Cabinet style is required',
    invalid_type_error: 'Invalid cabinet style'
  }),
  
  material: z.enum(Object.values(Material) as [Material, ...Material[]], {
    required_error: 'Material is required',
    invalid_type_error: 'Invalid material'
  }),
  
  finishColor: z.enum(Object.values(FinishColor) as [FinishColor, ...FinishColor[]], {
    required_error: 'Finish color is required',
    invalid_type_error: 'Invalid finish color'
  }),
  
  additionalComments: z.string()
    .max(2000, 'Additional comments must not exceed 2000 characters')
    .optional(),
  
  images: z.union([
    z.array(z.string().url('Invalid image URL format')),
    z.string().url('Invalid image URL format')
  ]).optional()
})

// Update quote status schema (for admin/seller)
export const updateQuoteStatusSchema = z.object({
  status: z.enum(Object.values(QuoteStatus) as [QuoteStatus, ...QuoteStatus[]], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status value'
  })
})

// Params schema for ID validation
export const idParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid quote ID format')
})

// Update quote response schema (for admin/seller)
export const updateQuoteResponseSchema = z.object({
  quotedPrice: z.number()
    .min(0, 'Quoted price must be a positive number')
    .or(z.string().transform(val => parseFloat(val))),
  
  estimatedTime: z.string()
    .min(1, 'Estimated time is required'),
  
  responseNotes: z.string()
    .max(2000, 'Response notes must not exceed 2000 characters')
    .optional(),
  
  status: z.enum([QuoteStatus.COMPLETED])
    .optional()
})

// Get quotes query schema
export const getQuotesSchema = z.object({
  status: z.enum(Object.values(QuoteStatus) as [QuoteStatus, ...QuoteStatus[]])
    .optional(),
  
  page: z.string()
    .transform(val => parseInt(val))
    .or(z.number())
    .pipe(z.number().int().min(1))
    .default(1),
  
  limit: z.string()
    .transform(val => parseInt(val))
    .or(z.number())
    .pipe(z.number().int().min(1).max(100))
    .default(10),
  
  sortBy: z.enum(['createdAt', 'updatedAt', 'status'])
    .default('createdAt'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
}).partial()